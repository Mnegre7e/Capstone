from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, requerir_admin, ROL_ADMIN_ID
from app.models.alert import SavedFilter
from app.models.announcement import Announcement
from app.models.audit import AuditLog
from app.models.favorite import SavedProperty
from app.models.feedback import Feedback
from app.models.property import Property, Comuna, PropertyEvaluation, PropertyView
from app.models.user import User
from app.routers.admin_panel import _esta_vigente  # la misma regla de "vigente" que usa el Panel
from app.schemas.reportes import (
    Reporte, UsuariosReporte, PublicacionesReporte, AlcanceReporte, PublicacionReporte,
    ActividadReporte, PuntoDeLaSerie, PersonaActiva,
)

# Paso 109: reportes del producto. Los puede ver el administrador y el analista
# (la web y, más adelante, la app usan esta misma ruta). Solo lectura: no cambia nada.
router = APIRouter(prefix="/reportes", tags=["Reportes"])

ROL_INVERSIONISTA_ID = 1
ROL_ANALISTA_ID = 2
NOMBRES_DE_ROL = {1: "inversionista", 2: "analista", 3: "administrador"}
ZONA_CHILE = ZoneInfo("America/Santiago")
CUANTAS_EN_EL_RANKING = 10
CUANTAS_PERSONAS = 10


def requerir_reportes(usuario: User = Depends(get_current_user)) -> User:
    if usuario.role_id == ROL_ADMIN_ID:
        return requerir_admin(usuario)  # el admin sigue necesitando la verificación en dos pasos
    if usuario.role_id == ROL_ANALISTA_ID:
        return usuario
    raise HTTPException(status_code=403, detail="Los reportes son solo para el administrador y el analista")


def _inicio_del_periodo(periodo: str, ahora_chile: datetime) -> datetime:
    """Desde cuándo cuenta el período, en hora de Chile y a las 00:00 (así los días y meses quedan completos)."""
    hoy = ahora_chile.replace(hour=0, minute=0, second=0, microsecond=0)
    if periodo == "7d":
        return hoy - timedelta(days=6)  # hoy y los 6 días anteriores
    if periodo == "30d":
        return hoy - timedelta(days=29)
    # 12m: desde el día 1 del mes de hace 11 meses (este mes y los 11 anteriores)
    mes, anio = hoy.month - 11, hoy.year
    if mes < 1:
        mes, anio = mes + 12, anio - 1
    return hoy.replace(year=anio, month=mes, day=1)


def _en_chile(fecha: datetime) -> datetime:
    if fecha.tzinfo is None:  # por si la base devuelve la fecha sin zona: se guarda en UTC
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha.astimezone(ZONA_CHILE)


def _casillas_de_la_serie(desde: datetime, ahora: datetime, por_mes: bool) -> list[str]:
    """Todas las fechas del período, aunque no tengan datos (así el gráfico no se salta días)."""
    casillas = []
    dia = desde.date()
    while dia <= ahora.date():
        casilla = dia.strftime("%Y-%m" if por_mes else "%Y-%m-%d")
        if casilla not in casillas:  # por mes, los 30 días de un mes dan una sola casilla
            casillas.append(casilla)
        dia += timedelta(days=1)
    return casillas


@router.get("", response_model=Reporte)
def ver_reporte(
    periodo: Literal["7d", "30d", "12m"] = Query("30d", description="7d = 7 días, 30d = 30 días, 12m = 12 meses"),
    db: Session = Depends(get_db),
    usuario: User = Depends(requerir_reportes),
):
    ahora = datetime.now(ZONA_CHILE)
    desde_chile = _inicio_del_periodo(periodo, ahora)
    desde = desde_chile.astimezone(timezone.utc)  # la base guarda las fechas en UTC
    por_mes = periodo == "12m"

    def casilla(fecha: datetime) -> str:
        return _en_chile(fecha).strftime("%Y-%m" if por_mes else "%Y-%m-%d")

    # ---------- 1) Usuarios (solo inversionistas: admin y analista son del equipo) ----------
    inversionistas = db.query(User).filter(User.role_id == ROL_INVERSIONISTA_ID)
    fechas_de_registro = [
        fecha for (fecha,) in inversionistas.with_entities(User.created_at).filter(User.created_at >= desde)
    ]
    # Desde dónde se registraron (se anota desde el paso 102; las cuentas anteriores quedan "sin_dato")
    plataformas = Counter(
        plataforma or "sin_dato"
        for (plataforma,) in db.query(AuditLog.platform)
        .join(User, User.id == AuditLog.user_id)
        .filter(AuditLog.action == "registro", AuditLog.created_at >= desde, User.role_id == ROL_INVERSIONISTA_ID)
    )
    nuevos = len(fechas_de_registro)
    por_plataforma = {"web": plataformas["web"], "app": plataformas["app"]}
    por_plataforma["sin_dato"] = max(nuevos - por_plataforma["web"] - por_plataforma["app"], 0)

    usuarios = UsuariosReporte(
        total=inversionistas.count(),
        activos=inversionistas.filter(User.is_active.is_(True)).count(),
        nuevos=nuevos,
        por_plataforma=por_plataforma,
        eliminaron_su_cuenta=inversionistas.filter(User.deleted_at >= desde).count(),
        suspendidas=inversionistas.filter(User.is_active.is_(False), User.deleted_at.is_(None)).count(),
    )

    # ---------- 2) Publicaciones ----------
    propiedades = db.query(
        Property.id, Property.title, Property.comuna_id, Property.status, Property.auction_date, Property.created_at,
        Property.removed_at,  # paso 114
    ).all()
    por_id = {p.id: p for p in propiedades}
    # Paso 114: las que el admin quitó del catálogo tampoco cuentan como vigentes
    vigentes = {p.id for p in propiedades if p.removed_at is None and _esta_vigente(p.status, p.auction_date, datetime.now(timezone.utc))}
    nuevas = [p.created_at for p in propiedades if p.created_at is not None and _en_chile(p.created_at) >= desde_chile]

    # Última evaluación de cada una (de la más antigua a la más nueva: queda la más reciente)
    ultimo_nivel = {}
    for property_id, nivel in db.query(PropertyEvaluation.property_id, PropertyEvaluation.result_level).order_by(
        PropertyEvaluation.evaluated_at
    ):
        ultimo_nivel[property_id] = nivel
    semaforo = {"verde": 0, "amarillo": 0, "rojo": 0, "sin_evaluar": 0}
    for pid in vigentes:
        semaforo[ultimo_nivel.get(pid) or "sin_evaluar"] += 1

    publicaciones = PublicacionesReporte(
        total=len(propiedades), nuevas=len(nuevas), vigentes=len(vigentes), semaforo=semaforo
    )

    # ---------- 3) Alcance: vistas y guardados del período ----------
    # Las vistas ya son solo de inversionistas (paso 11)
    vistas = db.query(PropertyView.user_id, PropertyView.property_id, PropertyView.viewed_at).filter(
        PropertyView.viewed_at >= desde
    ).all()
    guardados = (
        db.query(SavedProperty.user_id, SavedProperty.property_id, SavedProperty.saved_at)
        .join(User, User.id == SavedProperty.user_id)
        .filter(User.role_id == ROL_INVERSIONISTA_ID, SavedProperty.saved_at >= desde)
        .filter(SavedProperty.removed_at.is_(None))  # solo los que siguen guardados
        .all()
    )
    quitados = (
        db.query(SavedProperty)
        .join(User, User.id == SavedProperty.user_id)
        .filter(User.role_id == ROL_INVERSIONISTA_ID, SavedProperty.removed_at >= desde)
        .count()
    )
    alcance = AlcanceReporte(
        vistas=len(vistas),
        personas_que_vieron=len({v.user_id for v in vistas}),
        guardados=len(guardados),
        quitados=quitados,
    )

    # ---------- 4) Por publicación: ranking y favoritas del público ----------
    vistas_por_publicacion = Counter(v.property_id for v in vistas)
    personas_por_publicacion = {}
    for v in vistas:
        personas_por_publicacion.setdefault(v.property_id, set()).add(v.user_id)
    guardados_por_publicacion = Counter(g.property_id for g in guardados)
    comunas = dict(db.query(Comuna.id, Comuna.name).all())

    def fila(pid) -> PublicacionReporte:
        p = por_id[pid]
        return PublicacionReporte(
            id=pid,
            title=p.title,
            comuna=comunas.get(p.comuna_id),
            vistas=vistas_por_publicacion[pid],
            personas=len(personas_por_publicacion.get(pid, ())),
            guardados=guardados_por_publicacion[pid],
        )

    # Más vistas primero; si empatan, la más guardada
    con_vistas = sorted(
        (pid for pid in vistas_por_publicacion if pid in por_id),
        key=lambda pid: (vistas_por_publicacion[pid], guardados_por_publicacion[pid]),
        reverse=True,
    )
    ranking = [fila(pid) for pid in con_vistas[:CUANTAS_EN_EL_RANKING]]
    # Más guardada; si empatan, la más vista
    con_guardados = sorted(
        (pid for pid in guardados_por_publicacion if pid in por_id),
        key=lambda pid: (guardados_por_publicacion[pid], vistas_por_publicacion[pid]),
        reverse=True,
    )
    mas_vista = fila(con_vistas[0]) if con_vistas else None
    mas_guardada = fila(con_guardados[0]) if con_guardados else None

    # ---------- 5) Actividad: inicios de sesión, opiniones, alertas y anuncios ----------
    sesiones = db.query(AuditLog.role_id, AuditLog.user_id).filter(
        AuditLog.action == "inicio_sesion", AuditLog.created_at >= desde
    ).all()
    inicios = {nombre: 0 for nombre in NOMBRES_DE_ROL.values()}
    personas_que_entraron = {nombre: set() for nombre in NOMBRES_DE_ROL.values()}
    for role_id, user_id in sesiones:
        nombre = NOMBRES_DE_ROL.get(role_id)
        if nombre:
            inicios[nombre] += 1
            personas_que_entraron[nombre].add(user_id)

    calificaciones = [nota for (nota,) in db.query(Feedback.rating).filter(Feedback.created_at >= desde)]
    actividad = ActividadReporte(
        inicios_de_sesion=inicios,
        personas_que_entraron={nombre: len(ids) for nombre, ids in personas_que_entraron.items()},
        opiniones=len(calificaciones),
        calificacion_promedio=round(sum(calificaciones) / len(calificaciones), 1) if calificaciones else None,
        alertas_creadas=db.query(SavedFilter).filter(SavedFilter.created_at >= desde).count(),
        anuncios_enviados=db.query(Announcement).filter(Announcement.created_at >= desde).count(),
    )

    # ---------- 6) Serie: cuántos hubo cada día (o cada mes) ----------
    registros_por_casilla = Counter(casilla(f) for f in fechas_de_registro)
    publicaciones_por_casilla = Counter(casilla(f) for f in nuevas)
    vistas_por_casilla = Counter(casilla(v.viewed_at) for v in vistas)
    guardados_por_casilla = Counter(casilla(g.saved_at) for g in guardados)
    serie = [
        PuntoDeLaSerie(
            fecha=c,
            registros=registros_por_casilla[c],
            publicaciones=publicaciones_por_casilla[c],
            vistas=vistas_por_casilla[c],
            guardados=guardados_por_casilla[c],
        )
        for c in _casillas_de_la_serie(desde_chile, ahora, por_mes)
    ]

    # ---------- 7) Solo el administrador: quiénes fueron los más activos ----------
    personas_mas_activas = None
    if usuario.role_id == ROL_ADMIN_ID:
        vistas_por_persona = Counter(v.user_id for v in vistas)
        guardados_por_persona = Counter(g.user_id for g in guardados)
        ids = sorted(
            set(vistas_por_persona) | set(guardados_por_persona),
            key=lambda uid: (vistas_por_persona[uid] + guardados_por_persona[uid], guardados_por_persona[uid]),
            reverse=True,
        )[:CUANTAS_PERSONAS]
        personas = {p.id: p for p in db.query(User).filter(User.id.in_(ids))}
        personas_mas_activas = [
            PersonaActiva(
                user_id=uid,
                full_name=personas[uid].full_name,
                email=personas[uid].email,
                vistas=vistas_por_persona[uid],
                guardados=guardados_por_persona[uid],
            )
            for uid in ids
            if uid in personas
        ]

    return Reporte(
        periodo=periodo,
        desde=desde_chile,
        hasta=ahora,
        agrupado_por="mes" if por_mes else "dia",
        usuarios=usuarios,
        publicaciones=publicaciones,
        alcance=alcance,
        mas_vista=mas_vista,
        mas_guardada=mas_guardada,
        ranking=ranking,
        actividad=actividad,
        serie=serie,
        personas_mas_activas=personas_mas_activas,
    )