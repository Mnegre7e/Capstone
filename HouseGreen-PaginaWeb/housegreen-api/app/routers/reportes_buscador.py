import unicodedata
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import ROL_ADMIN_ID
from app.auth.premium import ambiente_de_pago
from app.models.alert import Alert, SavedFilter
from app.models.audit import AuditLog
from app.models.favorite import SavedProperty
from app.models.feedback import Feedback
from app.models.pago import Pago
from app.models.property import Property, Comuna, PropertyEvaluation, PropertyView
from app.models.user import User
from app.routers.admin_panel import _esta_vigente
from app.routers.reportes import (
    FORMATO_DE_CASILLA, ROL_INVERSIONISTA_ID, ZONA_CHILE, Periodo,
    _casillas_de_la_serie, _en_chile, _limites_del_periodo, requerir_reportes,
)
from app.schemas.reportes import PuntoDeLaSerie
from app.schemas.reportes_buscador import (
    FichaPersona, FichaRemate, PersonaDelRemate, PersonaEncontrada, RemateDeLaPersona, RemateEncontrado,
    ResultadosBusqueda,
)

# Paso 123d: buscador de Reportes.
# - GET /reportes/buscar?q=...       remates (admin y analista) y personas (solo admin) que calzan con el texto
# - GET /reportes/remates/{id}       ficha de un remate en el período (admin y analista; quiénes, solo admin)
# - GET /reportes/personas/{id}      ficha de una persona en el período (solo admin)
# Solo lectura: no cambia nada. Los períodos son los mismos de GET /reportes.
router = APIRouter(prefix="/reportes", tags=["Reportes"])

CUANTOS_RESULTADOS = 8  # por grupo (remates y personas) mientras se escribe
CUANTOS_EN_LA_FICHA = 50  # personas de un remate o remates de una persona


def _sin_tildes(texto: str | None) -> str:
    """"Ñuñoa" -> "nunoa": así se encuentra escriba como escriba (con o sin tildes y mayúsculas)."""
    return "".join(letra for letra in unicodedata.normalize("NFKD", (texto or "").lower()) if not unicodedata.combining(letra))


def _calza(palabras: list[str], *textos: str | None) -> bool:
    """Todas las palabras buscadas aparecen en alguno de los textos ("casa nunoa" calza con "Casa en Ñuñoa")."""
    junto = " ".join(_sin_tildes(texto) for texto in textos)
    return all(palabra in junto for palabra in palabras)


def _estado_del_remate(status, auction_date, removed_at, ahora_utc: datetime) -> str:
    if removed_at is not None:
        return "Quitado del catálogo"
    if _esta_vigente(status, auction_date, ahora_utc):
        return "Vigente"
    if status == "retirada":
        return "Retirado"
    return "Finalizado"


def _estado_de_la_persona(persona: User) -> str:
    if persona.deleted_at is not None:
        return "Eliminó su cuenta"
    return "Activa" if persona.is_active else "Suspendida"


def _solo_admin(usuario: User):
    if usuario.role_id != ROL_ADMIN_ID:
        raise HTTPException(status_code=403, detail="Solo el administrador puede ver los datos de una persona")


class _Periodo:
    """Los límites del período (los mismos de GET /reportes), en UTC para la base y en hora de Chile para mostrar."""

    def __init__(self, periodo: str, desde: date | None, hasta: date | None):
        self.ahora = datetime.now(ZONA_CHILE)
        self.periodo = periodo
        self.inicio_chile, self.fin_chile, self.agrupado = _limites_del_periodo(periodo, self.ahora, desde, hasta)
        self.inicio = self.inicio_chile.astimezone(timezone.utc)
        self.fin = self.fin_chile.astimezone(timezone.utc)
        self.formato = FORMATO_DE_CASILLA[self.agrupado]

    def incluye(self, columna):
        return (columna >= self.inicio) & (columna < self.fin)

    def casilla(self, fecha: datetime) -> str:
        return _en_chile(fecha).strftime(self.formato)

    def casillas(self) -> list[str]:
        return _casillas_de_la_serie(self.inicio_chile, self.fin_chile, self.agrupado)

    def hasta_para_mostrar(self) -> datetime:
        # En un rango que ya pasó, el último momento que cuenta es el final de su último día
        return self.fin_chile if self.fin_chile >= self.ahora else self.fin_chile - timedelta(seconds=1)


def _el_periodo(
    periodo: Periodo = Query("mes", description="hoy, semana, mes, anio o rango (con desde y hasta), como en GET /reportes"),
    desde: date | None = Query(None, description="rango: primer día (AAAA-MM-DD)"),
    hasta: date | None = Query(None, description="rango: último día, incluido (AAAA-MM-DD)"),
) -> _Periodo:
    return _Periodo(periodo, desde, hasta)


def _serie(p: _Periodo, vistas: list, guardados: list) -> list[PuntoDeLaSerie]:
    vistas_por_casilla = Counter(p.casilla(fecha) for fecha in vistas)
    guardados_por_casilla = Counter(p.casilla(fecha) for fecha in guardados)
    return [
        PuntoDeLaSerie(
            fecha=c, registros=0, publicaciones=0, vistas=vistas_por_casilla[c], guardados=guardados_por_casilla[c]
        )
        for c in p.casillas()
    ]


# ---------- Mientras se escribe ----------
@router.get("/buscar", response_model=ResultadosBusqueda)
def buscar(
    q: str = Query(..., min_length=2, max_length=80, description="nombre, comuna, dirección o código del remate; nombre o correo de la persona"),
    db: Session = Depends(get_db),
    usuario: User = Depends(requerir_reportes),
):
    palabras = _sin_tildes(q).split()
    if not palabras:
        raise HTTPException(status_code=422, detail="Escribe al menos 2 letras")
    ahora_utc = datetime.now(timezone.utc)
    comunas = dict(db.query(Comuna.id, Comuna.name).all())

    candidatos = db.query(
        Property.id, Property.title, Property.address, Property.comuna_id, Property.source_reference,
        Property.status, Property.auction_date, Property.removed_at,
    ).filter(Property.duplicate_of.is_(None))  # sin los remates repetidos (paso 124d)
    encontrados = [
        p
        for p in candidatos
        if _calza(palabras, p.title, p.address, comunas.get(p.comuna_id), p.source_reference)
    ]
    # Primero los vigentes; después los demás, del remate más reciente al más antiguo
    remates = sorted(
        (
            (
                RemateEncontrado(
                    id=p.id,
                    title=p.title,
                    comuna=comunas.get(p.comuna_id),
                    codigo=p.source_reference,
                    estado=_estado_del_remate(p.status, p.auction_date, p.removed_at, ahora_utc),
                ),
                p.auction_date or datetime.min.replace(tzinfo=timezone.utc),
            )
            for p in encontrados
        ),
        key=lambda par: (par[0].estado != "Vigente", -par[1].timestamp()),
    )

    personas = None
    if usuario.role_id == ROL_ADMIN_ID:
        personas = [
            PersonaEncontrada(id=u.id, full_name=u.full_name, email=u.email, estado=_estado_de_la_persona(u))
            for u in db.query(User).filter(User.role_id == ROL_INVERSIONISTA_ID).order_by(User.full_name)
            if _calza(palabras, u.full_name, u.email)
        ][:CUANTOS_RESULTADOS]

    return ResultadosBusqueda(remates=[remate for remate, _ in remates[:CUANTOS_RESULTADOS]], personas=personas)


# ---------- Ficha de un remate ----------
@router.get("/remates/{property_id}", response_model=FichaRemate)
def ficha_del_remate(
    property_id: UUID,
    p: _Periodo = Depends(_el_periodo),
    db: Session = Depends(get_db),
    usuario: User = Depends(requerir_reportes),
):
    remate = db.query(Property).filter(Property.id == property_id, Property.duplicate_of.is_(None)).first()
    if remate is None:
        raise HTTPException(status_code=404, detail="No encontramos ese remate")
    comuna = db.query(Comuna.name).filter(Comuna.id == remate.comuna_id).scalar()
    ultima = (
        db.query(PropertyEvaluation.result_level)
        .filter(PropertyEvaluation.property_id == remate.id)
        .order_by(PropertyEvaluation.evaluated_at.desc())
        .first()
    )

    # Las vistas ya son solo de inversionistas (paso 11); los guardados, como en GET /reportes
    vistas = db.query(PropertyView.user_id, PropertyView.viewed_at).filter(
        PropertyView.property_id == remate.id, p.incluye(PropertyView.viewed_at)
    ).all()
    favoritos = (
        db.query(SavedProperty.user_id, SavedProperty.saved_at, SavedProperty.removed_at)
        .join(User, User.id == SavedProperty.user_id)
        .filter(SavedProperty.property_id == remate.id, User.role_id == ROL_INVERSIONISTA_ID)
        .all()
    )
    guardados = [f for f in favoritos if f.removed_at is None and f.saved_at is not None and p.inicio <= f.saved_at < p.fin]
    quitados = [f for f in favoritos if f.removed_at is not None and p.inicio <= f.removed_at < p.fin]
    la_tienen = {f.user_id for f in favoritos if f.removed_at is None}
    avisos = (
        db.query(Alert)
        .join(User, User.id == Alert.user_id)
        .filter(Alert.property_id == remate.id, User.role_id == ROL_INVERSIONISTA_ID, p.incluye(Alert.created_at))
        .count()
    )

    ficha = FichaRemate(
        periodo=p.periodo,
        desde=p.inicio_chile,
        hasta=p.hasta_para_mostrar(),
        agrupado_por=p.agrupado,
        id=remate.id,
        title=remate.title,
        comuna=comuna,
        tipo=remate.property_type,
        direccion=remate.address,
        codigo=remate.source_reference,
        precio_minimo=int(remate.opening_price) if remate.opening_price is not None else None,
        fecha_del_remate=_en_chile(remate.auction_date) if remate.auction_date else None,
        estado=_estado_del_remate(remate.status, remate.auction_date, remate.removed_at, datetime.now(timezone.utc)),
        semaforo=ultima.result_level if ultima else "sin_evaluar",
        vistas=len(vistas),
        personas=len({v.user_id for v in vistas}),
        guardados=len(guardados),
        quitados=len(quitados),
        la_tienen_guardada=len(la_tienen),
        avisos=avisos,
        serie=_serie(p, [v.viewed_at for v in vistas], [g.saved_at for g in guardados]),
    )

    # Solo el administrador ve quiénes la vieron o la guardaron en el período
    if usuario.role_id == ROL_ADMIN_ID:
        vistas_por_persona = Counter(v.user_id for v in vistas)
        ids = set(vistas_por_persona) | {g.user_id for g in guardados}
        personas = {u.id: u for u in db.query(User).filter(User.id.in_(ids))} if ids else {}
        orden = sorted(ids, key=lambda uid: (vistas_por_persona[uid], uid in la_tienen), reverse=True)
        ficha.quienes = [
            PersonaDelRemate(
                user_id=uid,
                full_name=personas[uid].full_name,
                email=personas[uid].email,
                vistas=vistas_por_persona[uid],
                la_tiene_guardada=uid in la_tienen,
            )
            for uid in orden[:CUANTOS_EN_LA_FICHA]
            if uid in personas
        ]
    return ficha


# ---------- Ficha de una persona (solo el administrador) ----------
@router.get("/personas/{user_id}", response_model=FichaPersona)
def ficha_de_la_persona(
    user_id: UUID,
    p: _Periodo = Depends(_el_periodo),
    db: Session = Depends(get_db),
    usuario: User = Depends(requerir_reportes),
):
    _solo_admin(usuario)
    persona = db.query(User).filter(User.id == user_id, User.role_id == ROL_INVERSIONISTA_ID).first()
    if persona is None:
        raise HTTPException(status_code=404, detail="No encontramos a esa persona")

    registro = (
        db.query(AuditLog.platform)
        .filter(AuditLog.user_id == persona.id, AuditLog.action == "registro")
        .order_by(AuditLog.created_at)
        .first()
    )
    inicios = db.query(AuditLog.created_at).filter(AuditLog.user_id == persona.id, AuditLog.action == "inicio_sesion")
    ultimo_inicio = inicios.order_by(AuditLog.created_at.desc()).first()
    pagos = [
        monto
        for (monto,) in db.query(Pago.amount).filter(
            Pago.user_id == persona.id, Pago.status == "aprobado", Pago.environment == ambiente_de_pago()
        )
    ]

    vistas = db.query(PropertyView.property_id, PropertyView.viewed_at).filter(
        PropertyView.user_id == persona.id, p.incluye(PropertyView.viewed_at)
    ).all()
    favoritos = db.query(SavedProperty.property_id, SavedProperty.saved_at, SavedProperty.removed_at).filter(
        SavedProperty.user_id == persona.id
    ).all()
    guardados = [f for f in favoritos if f.removed_at is None and f.saved_at is not None and p.inicio <= f.saved_at < p.fin]
    quitados = [f for f in favoritos if f.removed_at is not None and p.inicio <= f.removed_at < p.fin]
    tiene_guardados = {f.property_id for f in favoritos if f.removed_at is None}

    # Los remates que vio o guardó en el período: los más vistos primero
    vistas_por_remate = Counter(v.property_id for v in vistas)
    ids = set(vistas_por_remate) | {g.property_id for g in guardados}
    remates = {r.id: r for r in db.query(Property.id, Property.title, Property.comuna_id).filter(Property.id.in_(ids))} if ids else {}
    comunas = dict(db.query(Comuna.id, Comuna.name).all())
    orden = sorted(ids, key=lambda pid: (vistas_por_remate[pid], pid in tiene_guardados), reverse=True)

    return FichaPersona(
        periodo=p.periodo,
        desde=p.inicio_chile,
        hasta=p.hasta_para_mostrar(),
        agrupado_por=p.agrupado,
        id=persona.id,
        full_name=persona.full_name,
        email=persona.email,
        estado=_estado_de_la_persona(persona),
        registrada_el=_en_chile(persona.created_at) if persona.created_at else None,
        plataforma=registro.platform if registro else None,
        ultimo_inicio=_en_chile(ultimo_inicio.created_at) if ultimo_inicio else None,
        premium_hasta=_en_chile(persona.premium_until) if persona.premium_until else None,
        premium_vigente=persona.premium_until is not None and persona.premium_until > datetime.now(timezone.utc),
        pagos=len(pagos),
        pagado=sum(pagos),
        inicios=inicios.filter(p.incluye(AuditLog.created_at)).count(),
        vistas=len(vistas),
        remates_vistos=len(vistas_por_remate),
        guardados=len(guardados),
        quitados=len(quitados),
        alertas_activas=db.query(SavedFilter)
        .filter(SavedFilter.user_id == persona.id, SavedFilter.removed_at.is_(None))
        .count(),
        opiniones=db.query(Feedback).filter(Feedback.user_id == persona.id, p.incluye(Feedback.created_at)).count(),
        serie=_serie(p, [v.viewed_at for v in vistas], [g.saved_at for g in guardados]),
        remates=[
            RemateDeLaPersona(
                id=pid,
                title=remates[pid].title,
                comuna=comunas.get(remates[pid].comuna_id),
                vistas=vistas_por_remate[pid],
                la_tiene_guardada=pid in tiene_guardados,
            )
            for pid in orden[:CUANTOS_EN_LA_FICHA]
            if pid in remates
        ],
    )