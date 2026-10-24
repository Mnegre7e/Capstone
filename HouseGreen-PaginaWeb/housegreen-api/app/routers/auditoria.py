from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import requerir_admin
from app.models.announcement import Announcement
from app.models.audit import AuditLog
from app.models.feedback import Feedback
from app.models.property import Property, Comuna
from app.models.user import User
from app.schemas.auditoria import RegistroAuditoria, PaginaAuditoria

# Paso 111: el administrador revisa el registro de actividad (tabla audit_logs, paso 101).
# Solo lectura: la tabla no se puede cambiar ni borrar (lo impiden los triggers de la base).
router = APIRouter(prefix="/admin", tags=["Admin"])

ROLES = {"inversionista": 1, "analista": 2, "administrador": 3}
NOMBRES_DE_ROL = {valor: nombre for nombre, valor in ROLES.items()}

# Grupos de acciones para filtrar (la web muestra estos nombres en una lista)
GRUPOS = {
    "sesiones": ["inicio_sesion", "inicio_sesion_fallido", "inicio_sesion_bloqueado"],
    "intentos_fallidos": ["inicio_sesion_fallido", "inicio_sesion_bloqueado"],
    "cuentas": [
        "registro", "perfil_editado", "contrasena_cambiada", "dos_pasos_activada", "dos_pasos_desactivada",
        "cuenta_eliminada", "cuenta_suspendida", "cuenta_reactivada",
    ],
    "favoritos_y_alertas": ["favorito_agregado", "favorito_quitado", "alerta_creada", "alerta_eliminada"],
    "opiniones": ["opinion_enviada", "opinion_respondida"],
    
        "publicaciones": [
        "descripcion_editada", "foto_subida", "foto_quitada", "fotos_ordenadas", "semaforo_editado",
        "publicacion_quitada", "publicacion_restaurada",  # paso 114
    ],
}

MAXIMO_POR_PAGINA = 100
NIVELES = {"verde": "verde", "amarillo": "amarillo o mejor", "rojo": "cualquier nivel"}


def _como_uuid(texto: str | None) -> UUID | None:
    try:
        return UUID(texto) if texto else None
    except ValueError:
        return None


def _nombres_de_las_entidades(db: Session, registros: list[AuditLog]) -> dict:
    """{(tipo, id): nombre legible}. Una consulta por tipo, no una por registro."""
    ids_por_tipo: dict[str, set[UUID]] = {}
    for r in registros:
        uid = _como_uuid(r.entity_id)
        if r.entity_type and uid:
            ids_por_tipo.setdefault(r.entity_type, set()).add(uid)

    nombres = {}
    if ids := ids_por_tipo.get("propiedad"):
        for pid, titulo in db.query(Property.id, Property.title).filter(Property.id.in_(ids)):
            nombres[("propiedad", str(pid))] = titulo
    if ids := ids_por_tipo.get("usuario"):
        for uid, correo in db.query(User.id, User.email).filter(User.id.in_(ids)):
            nombres[("usuario", str(uid))] = correo
    if ids := ids_por_tipo.get("anuncio"):
        for aid, titulo in db.query(Announcement.id, Announcement.title).filter(Announcement.id.in_(ids)):
            nombres[("anuncio", str(aid))] = titulo
    if ids := ids_por_tipo.get("opinion"):
        # De una opinión se muestra de quién es
        for oid, correo in db.query(Feedback.id, User.email).join(User, User.id == Feedback.user_id).filter(
            Feedback.id.in_(ids)
        ):
            nombres[("opinion", str(oid))] = correo
    return nombres


def _texto_de_la_alerta(condiciones, comunas: dict) -> str | None:
    """{"comuna_id": 1, "max_risk_level": "verde", "max_price": "90000000.00"} -> "Ñuñoa · verde · hasta $90.000.000"."""
    if not isinstance(condiciones, dict):
        return None
    partes = [comunas.get(condiciones.get("comuna_id"), "Todas las comunas")]
    if condiciones.get("max_risk_level"):
        partes.append(NIVELES.get(condiciones["max_risk_level"], condiciones["max_risk_level"]))
    if condiciones.get("max_price"):
        partes.append(f"hasta ${int(float(condiciones['max_price'])):,}".replace(",", "."))
    return " · ".join(partes)


@router.get("/auditoria", response_model=PaginaAuditoria)
def ver_auditoria(
    periodo: Literal["7d", "30d", "todo"] = Query("30d", description="7d = 7 días, 30d = 30 días, todo = desde el inicio"),
    rol: Literal["inversionista", "analista", "administrador", "sin_cuenta"] | None = Query(
        None, description="sin_cuenta = intentos con un correo que no está registrado"
    ),
    grupo: Literal[
        "sesiones", "intentos_fallidos", "cuentas", "favoritos_y_alertas", "opiniones", "publicaciones", "anuncios"
    ]
    | None = None,
    buscar: str | None = Query(None, description="parte del correo o del nombre de una persona"),
    antes_de: int | None = Query(None, description="para cargar más: el id del último registro que ya se mostró"),
    limite: int = Query(50, ge=1, le=MAXIMO_POR_PAGINA),
    db: Session = Depends(get_db),
    usuario=Depends(requerir_admin),
):
    consulta = db.query(AuditLog, User.full_name).outerjoin(User, User.id == AuditLog.user_id)

    if periodo != "todo":
        dias = 7 if periodo == "7d" else 30
        consulta = consulta.filter(AuditLog.created_at >= datetime.now(timezone.utc) - timedelta(days=dias))
    if rol == "sin_cuenta":
        consulta = consulta.filter(AuditLog.role_id.is_(None))
    elif rol:
        consulta = consulta.filter(AuditLog.role_id == ROLES[rol])
    if grupo:
        consulta = consulta.filter(AuditLog.action.in_(GRUPOS[grupo]))

    texto = (buscar or "").strip()
    if texto:
        patron = f"%{texto}%"
        # También aparece lo que el administrador le hizo a esa persona (suspender o reactivar su cuenta)
        ids_de_esas_personas = [
            str(uid) for (uid,) in db.query(User.id).filter(or_(User.email.ilike(patron), User.full_name.ilike(patron)))
        ]
        consulta = consulta.filter(
            or_(
                AuditLog.email.ilike(patron),
                User.full_name.ilike(patron),
                (AuditLog.entity_type == "usuario") & AuditLog.entity_id.in_(ids_de_esas_personas),
            )
        )

    total = consulta.count()  # cuántos hay en total con estos filtros (sin contar la página)

    if antes_de is not None:
        consulta = consulta.filter(AuditLog.id < antes_de)
    # Se pide uno más que el límite: si llega, quiere decir que hay más para cargar
    filas = consulta.order_by(AuditLog.id.desc()).limit(limite + 1).all()
    hay_mas = len(filas) > limite
    filas = filas[:limite]

    nombres = _nombres_de_las_entidades(db, [registro for registro, _ in filas])
    comunas = dict(db.query(Comuna.id, Comuna.name).all()) if any(r.entity_type == "alerta" for r, _ in filas) else {}

    registros = []
    for registro, nombre in filas:
        if registro.entity_type == "alerta":
            entidad_nombre = _texto_de_la_alerta(registro.new_value or registro.old_value, comunas)
        else:
            entidad_nombre = nombres.get((registro.entity_type, registro.entity_id))
        registros.append(
            RegistroAuditoria(
                id=registro.id,
                created_at=registro.created_at,
                email=registro.email,
                nombre=nombre,
                rol=NOMBRES_DE_ROL.get(registro.role_id),
                accion=registro.action,
                entidad_tipo=registro.entity_type,
                entidad_id=registro.entity_id,
                entidad_nombre=entidad_nombre,
                antes=registro.old_value,
                despues=registro.new_value,
                ip=registro.ip,
                plataforma=registro.platform,
            )
        )
    return PaginaAuditoria(total=total, registros=registros, hay_mas=hay_mas)