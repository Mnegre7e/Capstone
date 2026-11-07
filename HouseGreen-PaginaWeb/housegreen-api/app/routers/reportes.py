from collections import Counter
from datetime import date, datetime, timedelta, timezone
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, requerir_admin, ROL_ADMIN_ID
from app.models.alert import Alert, SavedFilter
from app.models.announcement import Announcement, AnnouncementRecipient
from app.models.audit import AuditLog
from app.models.favorite import SavedProperty
from app.models.feedback import Feedback
from app.models.property import Property, Comuna, PropertyEvaluation, PropertyFinancialInfo, PropertyView
from app.models.user import User
from app.routers.admin_panel import _esta_vigente  # la misma regla de "vigente" que usa el Panel
from app.schemas.reportes import (
    Reporte, UsuariosReporte, PublicacionesReporte, AlcanceReporte, PublicacionReporte,
    ActividadReporte, PuntoDeLaSerie, PersonaActiva,
    Cantidad, SubastasReporte, EmbudoReporte, AvisoPorTipo, AvisosReporte, UltimoAnuncio,  # paso 115
    FiltrosReporte,  # paso 123a
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
CUANTAS_COMUNAS = 8  # paso 115: las demás se suman en "Otras comunas"
DIAS_PARA_REMATAR_PRONTO = 7  # paso 115: "se rematan pronto" = en los próximos 7 días
DIAS_POR_DIA = 62  # paso 123a: un rango de hasta 62 días se ve día a día; uno más largo, mes a mes
ANIOS_DEL_RANGO = 5  # paso 123a: el rango puede ser de hasta 5 años

# Paso 123a: los períodos que se pueden pedir. Los de antes (7d, 30d, 12m) siguen funcionando.
Periodo = Literal["hoy", "semana", "mes", "anio", "rango", "7d", "30d", "12m"]
# Las mismas 8 categorías de tipo de propiedad del catálogo (housegreen-web/src/components/tipoPropiedad.ts)
Categoria = Literal["departamento", "casa", "terreno", "parcela", "comercial", "bodega", "derechos", "otro"]
Nivel = Literal["verde", "amarillo", "rojo", "sin_evaluar"]


def categoria_de_tipo(tipo: str | None) -> str:
    """Paso 123a: la categoría de un tipo del sitio ("Parcela con casa" -> "parcela").
    Es la misma regla de categoriaDeTipo en la web (tipoPropiedad.ts): si se cambia una, se cambia la otra."""
    texto = (tipo or "").lower()

    def contiene(palabras: list[str]) -> bool:
        return any(palabra in texto for palabra in palabras)

    # El orden importa: "parcela con casa" debe quedar como parcela, no como casa
    if contiene(["derecho", "usufructo", "nuda propiedad"]):
        return "derechos"
    if contiene(["parcela", "predio", "fundo", "hijuela", "agrícola", "agricola"]):
        return "parcela"
    if contiene(["casa", "vivienda"]):
        return "casa"
    if contiene(["departamento"]):
        return "departamento"
    if contiene(["oficina", "local"]):
        return "comercial"
    if contiene(["bodega", "estacionamiento"]):
        return "bodega"
    if contiene(["sitio", "lote", "terreno"]):
        return "terreno"
    return "otro"


def requerir_reportes(usuario: User = Depends(get_current_user)) -> User:
    if usuario.role_id == ROL_ADMIN_ID:
        return requerir_admin(usuario)  # el admin sigue necesitando la verificación en dos pasos
    if usuario.role_id == ROL_ANALISTA_ID:
        return usuario
    raise HTTPException(status_code=403, detail="Los reportes son solo para el administrador y el analista")


def _a_las_cero(dia: date) -> datetime:
    return datetime(dia.year, dia.month, dia.day, tzinfo=ZONA_CHILE)


def _limites_del_periodo(
    periodo: str, ahora_chile: datetime, desde: date | None = None, hasta: date | None = None
) -> tuple[datetime, datetime, str]:
    """Paso 123a: (inicio, fin, cómo se agrupa la serie). Todo en hora de Chile; el fin no se incluye.
    Los días, semanas, meses y años empiezan a las 00:00, así quedan completos."""
    hoy = ahora_chile.replace(hour=0, minute=0, second=0, microsecond=0)
    if periodo == "hoy":
        return hoy, ahora_chile, "hora"
    if periodo == "semana":
        return hoy - timedelta(days=hoy.weekday()), ahora_chile, "dia"  # desde el lunes
    if periodo == "mes":
        return hoy.replace(day=1), ahora_chile, "dia"
    if periodo == "anio":
        return hoy.replace(month=1, day=1), ahora_chile, "mes"
    if periodo == "rango":
        if desde is None or hasta is None:
            raise HTTPException(status_code=422, detail="Elige la fecha de inicio y la de término del rango")
        if desde > hasta:
            raise HTTPException(status_code=422, detail="La fecha de inicio no puede ser posterior a la de término")
        if desde > hoy.date():
            raise HTTPException(status_code=422, detail="El rango no puede empezar en el futuro")
        if (hasta - desde).days > ANIOS_DEL_RANGO * 366:
            raise HTTPException(status_code=422, detail=f"El rango puede ser de hasta {ANIOS_DEL_RANGO} años")
        inicio = _a_las_cero(desde)
        fin = min(_a_las_cero(hasta + timedelta(days=1)), ahora_chile)  # se incluye todo el día de término
        return inicio, fin, "dia" if (hasta - desde).days < DIAS_POR_DIA else "mes"
    # Los de antes (paso 109)
    if periodo == "7d":
        return hoy - timedelta(days=6), ahora_chile, "dia"  # hoy y los 6 días anteriores
    if periodo == "30d":
        return hoy - timedelta(days=29), ahora_chile, "dia"
    # 12m: desde el día 1 del mes de hace 11 meses (este mes y los 11 anteriores)
    mes, anio = hoy.month - 11, hoy.year
    if mes < 1:
        mes, anio = mes + 12, anio - 1
    return hoy.replace(year=anio, month=mes, day=1), ahora_chile, "mes"


def _en_chile(fecha: datetime) -> datetime:
    if fecha.tzinfo is None:  # por si la base devuelve la fecha sin zona: se guarda en UTC
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha.astimezone(ZONA_CHILE)


def _las_primeras(conteo: Counter, cuantas: int, nombre_del_resto: str) -> list[Cantidad]:
    """Paso 115: las que más tienen (de mayor a menor) y, si sobran, el resto sumado en una sola fila.
    Si empatan, van por orden alfabético (así la lista sale siempre igual)."""
    ordenadas = sorted(conteo.items(), key=lambda par: (-par[1], par[0]))
    filas = [Cantidad(nombre=nombre, cantidad=cantidad) for nombre, cantidad in ordenadas[:cuantas]]
    resto = sum(cantidad for _, cantidad in ordenadas[cuantas:])
    if resto:
        filas.append(Cantidad(nombre=nombre_del_resto, cantidad=resto))
    return filas


FORMATO_DE_CASILLA = {"hora": "%Y-%m-%dT%H", "dia": "%Y-%m-%d", "mes": "%Y-%m"}


def _casillas_de_la_serie(inicio: datetime, fin: datetime, agrupado: str) -> list[str]:
    """Todas las horas, días o meses del período, aunque no tengan datos (así el gráfico no se salta ninguno).
    Paso 123a: también por hora ("Hoy") y hasta el fin del período (en un rango que ya pasó)."""
    formato = FORMATO_DE_CASILLA[agrupado]
    paso = timedelta(hours=1) if agrupado == "hora" else timedelta(days=1)
    momento = inicio
    casillas = []
    while momento < fin or not casillas:
        casilla = momento.strftime(formato)
        if casilla not in casillas:  # por mes, los 30 días de un mes dan una sola casilla
            casillas.append(casilla)
        # Se avanza en hora de Chile (los días con cambio de horario tienen 23 o 25 horas)
        momento = (momento.astimezone(timezone.utc) + paso).astimezone(ZONA_CHILE) if agrupado == "hora" else momento + paso
    return casillas


@router.get("", response_model=Reporte)
def ver_reporte(
    periodo: Periodo = Query(
        "30d", description="hoy, semana (desde el lunes), mes, anio, rango (con desde y hasta) o los de antes: 7d, 30d, 12m"
    ),
    desde: date | None = Query(None, description="rango: primer día (AAAA-MM-DD)"),
    hasta: date | None = Query(None, description="rango: último día, incluido (AAAA-MM-DD)"),
    comuna_id: int | None = Query(None, description="solo los remates de esta comuna"),
    tipo: Categoria | None = Query(None, description="solo los remates de esta categoría (como en el catálogo)"),
    semaforo: Nivel | None = Query(None, description="solo los remates con este semáforo"),
    db: Session = Depends(get_db),
    usuario: User = Depends(requerir_reportes),
):
    ahora = datetime.now(ZONA_CHILE)
    inicio_chile, fin_chile, agrupado = _limites_del_periodo(periodo, ahora, desde, hasta)
    # La base guarda las fechas en UTC
    inicio, fin = inicio_chile.astimezone(timezone.utc), fin_chile.astimezone(timezone.utc)
    formato = FORMATO_DE_CASILLA[agrupado]

    def casilla(fecha: datetime) -> str:
        return _en_chile(fecha).strftime(formato)

    def en_el_periodo(columna):
        """Paso 123a: desde el inicio y hasta el fin del período (en un rango que ya pasó, no cuenta lo de después)."""
        return (columna >= inicio) & (columna < fin)

    # ---------- 1) Usuarios (solo inversionistas: admin y analista son del equipo) ----------
    inversionistas = db.query(User).filter(User.role_id == ROL_INVERSIONISTA_ID)
    fechas_de_registro = [
        fecha for (fecha,) in inversionistas.with_entities(User.created_at).filter(en_el_periodo(User.created_at))
    ]
    # Desde dónde se registraron (se anota desde el paso 102; las cuentas anteriores quedan "sin_dato")
    plataformas = Counter(
        plataforma or "sin_dato"
        for (plataforma,) in db.query(AuditLog.platform)
        .join(User, User.id == AuditLog.user_id)
        .filter(AuditLog.action == "registro", en_el_periodo(AuditLog.created_at), User.role_id == ROL_INVERSIONISTA_ID)
    )
    nuevos = len(fechas_de_registro)
    por_plataforma = {"web": plataformas["web"], "app": plataformas["app"]}
    por_plataforma["sin_dato"] = max(nuevos - por_plataforma["web"] - por_plataforma["app"], 0)

    usuarios = UsuariosReporte(
        total=inversionistas.count(),
        activos=inversionistas.filter(User.is_active.is_(True)).count(),
        nuevos=nuevos,
        por_plataforma=por_plataforma,
        eliminaron_su_cuenta=inversionistas.filter(en_el_periodo(User.deleted_at)).count(),
        suspendidas=inversionistas.filter(User.is_active.is_(False), User.deleted_at.is_(None)).count(),
    )

    # ---------- 2) Publicaciones ----------
    # Última evaluación de cada una (de la más antigua a la más nueva: queda la más reciente)
    ultimo_nivel = {}
    for property_id, nivel in db.query(PropertyEvaluation.property_id, PropertyEvaluation.result_level).order_by(
        PropertyEvaluation.evaluated_at
    ):
        ultimo_nivel[property_id] = nivel

    def nivel_de(pid) -> str:
        return ultimo_nivel.get(pid) or "sin_evaluar"

    # Paso 123a: los filtros de comuna, tipo y semáforo eligen con qué remates se calcula todo lo de los remates
    # (publicaciones, subastas, vistas, guardados, avisos y la serie). Lo de las personas no cambia.
    todas = db.query(
        Property.id, Property.title, Property.comuna_id, Property.status, Property.auction_date, Property.created_at,
        Property.removed_at,  # paso 114
        Property.property_type,  # paso 115
    ).filter(Property.duplicate_of.is_(None)).all()  # paso 124d: sin los remates repetidos
    propiedades = [
        p
        for p in todas
        if (comuna_id is None or p.comuna_id == comuna_id)
        and (tipo is None or categoria_de_tipo(p.property_type) == tipo)
        and (semaforo is None or nivel_de(p.id) == semaforo)
    ]
    por_id = {p.id: p for p in propiedades}
    # Paso 114: las que el admin quitó del catálogo tampoco cuentan como vigentes
    vigentes = {p.id for p in propiedades if p.removed_at is None and _esta_vigente(p.status, p.auction_date, datetime.now(timezone.utc))}
    nuevas = [p.created_at for p in propiedades if p.created_at is not None and inicio <= p.created_at < fin]

    semaforo_vigentes = {"verde": 0, "amarillo": 0, "rojo": 0, "sin_evaluar": 0}
    for pid in vigentes:
        semaforo_vigentes[nivel_de(pid)] += 1

    publicaciones = PublicacionesReporte(
        total=len(propiedades), nuevas=len(nuevas), vigentes=len(vigentes), semaforo=semaforo_vigentes
    )

    # ---------- 3) Alcance: vistas y guardados del período (solo de los remates elegidos) ----------
    # Las vistas ya son solo de inversionistas (paso 11)
    vistas = [
        v
        for v in db.query(PropertyView.user_id, PropertyView.property_id, PropertyView.viewed_at).filter(
            en_el_periodo(PropertyView.viewed_at)
        )
        if v.property_id in por_id
    ]
    guardados = [
        g
        for g in db.query(SavedProperty.user_id, SavedProperty.property_id, SavedProperty.saved_at)
        .join(User, User.id == SavedProperty.user_id)
        .filter(User.role_id == ROL_INVERSIONISTA_ID, en_el_periodo(SavedProperty.saved_at))
        .filter(SavedProperty.removed_at.is_(None))  # solo los que siguen guardados
        if g.property_id in por_id
    ]
    quitados = sum(
        1
        for (pid,) in db.query(SavedProperty.property_id)
        .join(User, User.id == SavedProperty.user_id)
        .filter(User.role_id == ROL_INVERSIONISTA_ID, en_el_periodo(SavedProperty.removed_at))
        if pid in por_id
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
        AuditLog.action == "inicio_sesion", en_el_periodo(AuditLog.created_at)
    ).all()
    inicios = {nombre: 0 for nombre in NOMBRES_DE_ROL.values()}
    personas_que_entraron = {nombre: set() for nombre in NOMBRES_DE_ROL.values()}
    for role_id, user_id in sesiones:
        nombre = NOMBRES_DE_ROL.get(role_id)
        if nombre:
            inicios[nombre] += 1
            personas_que_entraron[nombre].add(user_id)

    calificaciones = [nota for (nota,) in db.query(Feedback.rating).filter(en_el_periodo(Feedback.created_at))]
    actividad = ActividadReporte(
        inicios_de_sesion=inicios,
        personas_que_entraron={nombre: len(ids) for nombre, ids in personas_que_entraron.items()},
        opiniones=len(calificaciones),
        calificacion_promedio=round(sum(calificaciones) / len(calificaciones), 1) if calificaciones else None,
        alertas_creadas=db.query(SavedFilter).filter(en_el_periodo(SavedFilter.created_at)).count(),
        anuncios_enviados=db.query(Announcement).filter(en_el_periodo(Announcement.created_at)).count(),
    )

    # ---------- 6) Serie: cuántos hubo cada hora, día o mes ----------
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
        for c in _casillas_de_la_serie(inicio_chile, fin_chile, agrupado)
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

    # ---------- 8) Paso 115, Subastas: cuándo se rematan, dónde están y de qué tipo son los vigentes ----------
    limite_pronto = ahora + timedelta(days=DIAS_PARA_REMATAR_PRONTO)
    rematan_pronto = sum(
        1
        for pid in vigentes
        if por_id[pid].auction_date is not None and _en_chile(por_id[pid].auction_date) <= limite_pronto
    )
    # "Revisadas": el administrador ya les puso la zona de precio (el semáforo se calcula con más datos)
    con_zona = {
        pid
        for (pid,) in db.query(PropertyFinancialInfo.property_id).filter(PropertyFinancialInfo.market_zone.isnot(None))
    }
    subastas = SubastasReporte(
        vigentes=len(vigentes),
        rematan_pronto=rematan_pronto,
        revisadas=len(vigentes & con_zona),
        por_comuna=_las_primeras(
            Counter(comunas.get(por_id[pid].comuna_id, "Sin comuna") for pid in vigentes), CUANTAS_COMUNAS, "Otras comunas"
        ),
        por_tipo=dict(Counter(por_id[pid].property_type for pid in vigentes)),
    )

    # ---------- 9) Paso 115, Usuarios: embudo, comunas que siguen y notas de las opiniones ----------
    # El embudo es desde el inicio y solo cuenta inversionistas con la cuenta activa
    activos = {uid for (uid,) in inversionistas.with_entities(User.id).filter(User.is_active.is_(True))}
    vieron_alguna = {uid for (uid,) in db.query(PropertyView.user_id).distinct()} & activos
    con_favoritos = {
        uid for (uid,) in db.query(SavedProperty.user_id).filter(SavedProperty.removed_at.is_(None)).distinct()
    } & activos
    alertas_activas = [
        alerta
        for alerta in db.query(SavedFilter.user_id, SavedFilter.comuna_id).filter(SavedFilter.removed_at.is_(None))
        if alerta.user_id in activos
    ]
    embudo = EmbudoReporte(
        activos=len(activos),
        vieron=len(vieron_alguna),
        guardaron=len(con_favoritos),
        con_alertas=len({alerta.user_id for alerta in alertas_activas}),
    )
    # Cuántas personas siguen cada comuna (una alerta sin comuna sigue "Todas las comunas")
    personas_por_comuna = {}
    for alerta in alertas_activas:
        nombre = comunas.get(alerta.comuna_id, "Sin comuna") if alerta.comuna_id else "Todas las comunas"
        personas_por_comuna.setdefault(nombre, set()).add(alerta.user_id)
    comunas_seguidas = _las_primeras(
        Counter({nombre: len(ids) for nombre, ids in personas_por_comuna.items()}), CUANTAS_COMUNAS, "Otras comunas"
    )
    # Las opiniones del período, por nota (de 1 a 5 estrellas)
    por_nota = Counter(calificaciones)
    notas = {str(nota): por_nota[nota] for nota in range(1, 6)}

    # ---------- 10) Paso 115, Alcance: avisos automáticos, último anuncio y desde dónde entran ----------
    hay_filtros = comuna_id is not None or tipo is not None or semaforo is not None
    avisos_del_periodo = [
        aviso
        for aviso in db.query(Alert.alert_type, Alert.is_read, Alert.property_id)
        .join(User, User.id == Alert.user_id)
        .filter(User.role_id == ROL_INVERSIONISTA_ID, en_el_periodo(Alert.created_at))
        # Paso 123a: con filtros, solo los avisos de los remates elegidos
        if not hay_filtros or aviso.property_id in por_id
    ]
    enviados_por_tipo = Counter(aviso.alert_type for aviso in avisos_del_periodo)
    leidos_por_tipo = Counter(aviso.alert_type for aviso in avisos_del_periodo if aviso.is_read)
    avisos = AvisosReporte(
        enviados=len(avisos_del_periodo),
        leidos=sum(leidos_por_tipo.values()),
        por_tipo=[
            AvisoPorTipo(tipo=tipo_de_aviso, enviados=enviados, leidos=leidos_por_tipo[tipo_de_aviso])
            for tipo_de_aviso, enviados in enviados_por_tipo.most_common()
        ],
    )

    # El anuncio más reciente (de cualquier fecha) y cuántos de sus destinatarios lo abrieron
    ultimo_anuncio = None
    anuncio = db.query(Announcement).order_by(Announcement.created_at.desc()).first()
    if anuncio is not None:
        lecturas = [
            leido_el
            for (leido_el,) in db.query(AnnouncementRecipient.read_at).filter(
                AnnouncementRecipient.announcement_id == anuncio.id
            )
        ]
        ultimo_anuncio = UltimoAnuncio(
            titulo=anuncio.title,
            enviado_el=_en_chile(anuncio.created_at),
            destinatarios=len(lecturas),
            leidos=sum(1 for leido_el in lecturas if leido_el is not None),
        )

    # Inicios de sesión de inversionistas del período, según desde dónde entraron
    plataformas_de_inicio = Counter(
        plataforma
        for (plataforma,) in db.query(AuditLog.platform).filter(
            AuditLog.action == "inicio_sesion", en_el_periodo(AuditLog.created_at), AuditLog.role_id == ROL_INVERSIONISTA_ID
        )
    )
    total_de_inicios = sum(plataformas_de_inicio.values())
    inicios_por_plataforma = {"web": plataformas_de_inicio["web"], "app": plataformas_de_inicio["app"]}
    inicios_por_plataforma["sin_dato"] = total_de_inicios - inicios_por_plataforma["web"] - inicios_por_plataforma["app"]

    return Reporte(
        periodo=periodo,
        desde=inicio_chile,
        # Paso 123a: el último momento que cuenta (en un rango que ya pasó, el final de su último día)
        hasta=fin_chile if fin_chile >= ahora else fin_chile - timedelta(seconds=1),
        agrupado_por=agrupado,
        filtros=FiltrosReporte(comuna_id=comuna_id, comuna=comunas.get(comuna_id), tipo=tipo, semaforo=semaforo),
        usuarios=usuarios,
        publicaciones=publicaciones,
        alcance=alcance,
        mas_vista=mas_vista,
        mas_guardada=mas_guardada,
        ranking=ranking,
        actividad=actividad,
        serie=serie,
        personas_mas_activas=personas_mas_activas,
        subastas=subastas,
        embudo=embudo,
        comunas_seguidas=comunas_seguidas,
        calificaciones=notas,
        avisos=avisos,
        ultimo_anuncio=ultimo_anuncio,
        inicios_por_plataforma=inicios_por_plataforma,
    )