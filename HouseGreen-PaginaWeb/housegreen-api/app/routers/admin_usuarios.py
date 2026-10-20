from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import requerir_admin, ROL_ADMIN_ID
from app.auditoria import anotar
from app.models.property import PropertyView
from app.models.favorite import SavedProperty
from app.models.feedback import Feedback
from app.models.user import User, Role
from app.schemas.admin_usuarios import UsuarioAdmin, EstadoCuenta

# Paso 85: usuarios registrados, para el administrador.
# Paso 106: además puede suspender una cuenta y reactivar una suspendida o eliminada.
router = APIRouter(prefix="/admin", tags=["Admin"])


def _cantidad_y_ultima(db: Session, columna_usuario, columna_id, columna_fecha, *condiciones) -> dict:
    """Por cada usuario: (cuántas filas tiene, fecha de la más reciente). Una sola consulta con GROUP BY.
    Paso 103: las condiciones (opcionales) filtran las filas que se cuentan."""
    return {
        user_id: (cantidad, ultima)
        for user_id, cantidad, ultima in db.query(
            columna_usuario, func.count(columna_id), func.max(columna_fecha)
        )
        .filter(*condiciones)
        .group_by(columna_usuario)
    }


@router.get("/usuarios", response_model=list[UsuarioAdmin])
def listar_usuarios(db: Session = Depends(get_db), usuario=Depends(requerir_admin)):
    roles = dict(db.query(Role.id, Role.name).all())

    vistas = _cantidad_y_ultima(db, PropertyView.user_id, PropertyView.id, PropertyView.viewed_at)
    # Paso 103: solo cuentan los favoritos que siguen guardados
    guardados = _cantidad_y_ultima(
        db, SavedProperty.user_id, SavedProperty.id, SavedProperty.saved_at, SavedProperty.removed_at.is_(None)
    )
    opiniones = _cantidad_y_ultima(db, Feedback.user_id, Feedback.id, Feedback.created_at)

    resultado = []
    # Los más nuevos primero
    for persona in db.query(User).order_by(User.created_at.desc()):
        n_vistas, ultima_vista = vistas.get(persona.id, (0, None))
        n_guardados, ultimo_guardado = guardados.get(persona.id, (0, None))
        n_opiniones, ultima_opinion = opiniones.get(persona.id, (0, None))
        fechas = [fecha for fecha in (ultima_vista, ultimo_guardado, ultima_opinion) if fecha is not None]
        resultado.append(
            UsuarioAdmin(
                id=persona.id,
                full_name=persona.full_name,
                email=persona.email,
                phone=persona.phone,
                role_name=roles.get(persona.role_id),
                is_active=bool(persona.is_active),
                deleted_at=persona.deleted_at,
                two_fa_enabled=bool(persona.two_fa_enabled),
                created_at=persona.created_at,
                vistas=n_vistas,
                guardados=n_guardados,
                opiniones=n_opiniones,
                ultima_actividad=max(fechas) if fechas else None,
            )
        )
    return resultado


# ---------- Paso 106: suspender y reactivar cuentas ----------

def _persona(db: Session, user_id: UUID) -> User:
    persona = db.query(User).filter(User.id == user_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return persona


def _estado(persona: User) -> str:
    if persona.is_active:
        return "activa"
    return "eliminada" if persona.deleted_at is not None else "suspendida"


@router.post("/usuarios/{user_id}/suspender", response_model=EstadoCuenta)
def suspender_cuenta(
    user_id: UUID, request: Request, db: Session = Depends(get_db), admin: User = Depends(requerir_admin)
):
    persona = _persona(db, user_id)
    if persona.id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes suspender tu propia cuenta.")
    if persona.role_id == ROL_ADMIN_ID:
        raise HTTPException(status_code=400, detail="Las cuentas de administrador no se pueden suspender desde aquí.")
    if not persona.is_active:
        raise HTTPException(status_code=400, detail="Esta cuenta ya está suspendida.")

    # No se borra nada: la persona no puede entrar ni recibe anuncios ni avisos
    persona.is_active = False
    anotar(
        db,
        "cuenta_suspendida",
        request=request,
        usuario=admin,  # quién lo hizo
        entidad_tipo="usuario",
        entidad_id=persona.id,  # a quién
        antes={"estado": "activa"},
        despues={"estado": "suspendida", "email": persona.email},
    )
    db.commit()
    return EstadoCuenta(id=persona.id, is_active=persona.is_active, deleted_at=persona.deleted_at)


@router.post("/usuarios/{user_id}/reactivar", response_model=EstadoCuenta)
def reactivar_cuenta(
    user_id: UUID, request: Request, db: Session = Depends(get_db), admin: User = Depends(requerir_admin)
):
    persona = _persona(db, user_id)
    if persona.is_active:
        raise HTTPException(status_code=400, detail="Esta cuenta ya está activa.")

    # Antes de reactivar se anota cómo estaba (si la eliminó su dueño, también cuándo)
    antes = {"estado": _estado(persona)}
    if persona.deleted_at is not None:
        antes["eliminada_el"] = persona.deleted_at.isoformat()

    persona.is_active = True
    persona.deleted_at = None
    anotar(
        db,
        "cuenta_reactivada",
        request=request,
        usuario=admin,  # quién lo hizo
        entidad_tipo="usuario",
        entidad_id=persona.id,  # a quién
        antes=antes,
        despues={"estado": "activa", "email": persona.email},
    )
    db.commit()
    return EstadoCuenta(id=persona.id, is_active=persona.is_active, deleted_at=persona.deleted_at)