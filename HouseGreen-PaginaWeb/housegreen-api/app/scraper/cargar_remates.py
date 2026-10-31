from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from app.database import SessionLocal
from app.models.property import Comuna, Property
from app.routers.alerts import recalcular_semaforo_y_avisar
from app.routers.properties import crear_propiedad
from app.schemas.property import PropertyCreate
from app.scraper.comuna_matcher import normalizar
from app.scraper.remates_scraper import leer_remates

# Nombre de la fuente: se guarda en source_system junto con el número del remate (source_reference).
# Con esos dos datos la base sabe si un remate ya fue cargado.
FUENTE = "rematesinmobiliarios"

ZONA_CHILE = ZoneInfo("America/Santiago")

# Paso 118b: si el precio en pesos cambia menos que esto, es solo la UF del día
# (el sitio convierte a pesos los remates en UF): no se toma como un cambio del remate.
CAMBIO_MINIMO_DE_PRECIO = 0.02  # 2 %

def tipo_de_remate(texto: str | None) -> str | None:
    # En la base se guarda "judicial", "extrajudicial" o "contribuciones" (paso 118b: remates de la Tesorería).
    # Se pregunta primero por "extrajudicial" porque esa palabra también contiene "judicial".
    texto = normalizar(texto or "")
    if "extrajudicial" in texto:
        return "extrajudicial"
    if "contribuciones" in texto or "tesoreria" in texto:
        return "contribuciones"
    if "judicial" in texto:
        return "judicial"
    return None

def armar_propiedad(remate: dict, comuna: Comuna, tipo_remate: str) -> PropertyCreate:
    # Convierte un remate del scraper en los datos que pide la API para crear una propiedad
    tipo = (remate["tipo_propiedad"] or "propiedad").lower()
    fecha = remate["fecha_remate"]
    return PropertyCreate(
        title=f"{tipo.capitalize()} en {comuna.name}",  # "Departamento en Providencia"
        address=(remate["direccion"] or "")[:255] or None,
        comuna_id=comuna.id,
        property_type=tipo,
        auction_type=tipo_remate,
        opening_price=Decimal(int(remate["precio_minimo"])),
        # El listado no trae la hora del remate: se guarda a las 00:00 de Chile,
        # que en HouseGreen significa "hora no informada"
        auction_date=datetime(fecha.year, fecha.month, fecha.day, tzinfo=ZONA_CHILE) if fecha else None,
        surface_m2=Decimal(str(remate["m2"])) if remate["m2"] else None,
        source_system=FUENTE,
        source_reference=remate["remate_id"],
    )


def pesos(valor) -> str:
    # 45000000 -> "$45.000.000"
    return "$" + f"{int(valor):,}".replace(",", ".")


def actualizar_existente(db, guardado, remate: dict) -> tuple[str | None, bool]:
    """Paso 118: un remate que ya estaba en la base vuelve a aparecer en el listado.
    "guardado" son sus datos tal como están en la base (id, status, opening_price, auction_date).
    Si el sitio le cambió el precio mínimo o la fecha, o lo volvió a publicar después de quitarlo,
    se actualiza y se recalcula su semáforo.
    Devuelve una frase con lo que cambió (None si nada cambió) y si cambió la fecha
    (en ese caso hay que volver a leer su ficha, que trae la hora nueva)."""
    cambios = []
    nuevos = {}

    if guardado.status == "retirada":
        nuevos["status"] = "disponible"
        cambios.append("volvió a aparecer en el sitio")

    precio = remate["precio_minimo"]
    anterior = guardado.opening_price or Decimal(0)
    if precio and abs(Decimal(int(precio)) - anterior) > anterior * Decimal(str(CAMBIO_MINIMO_DE_PRECIO)):
        nuevos["opening_price"] = Decimal(int(precio))
        cambios.append(f"precio de {pesos(guardado.opening_price)} a {pesos(precio)}")

    # Se compara solo el día (en hora de Chile): la hora exacta la pone la ficha
    fecha = remate["fecha_remate"]
    fecha_guardada = guardado.auction_date.astimezone(ZONA_CHILE).date() if guardado.auction_date else None
    if fecha and fecha != fecha_guardada:
        nuevos["auction_date"] = datetime(fecha.year, fecha.month, fecha.day, tzinfo=ZONA_CHILE)
        antes = fecha_guardada.strftime("%d-%m-%Y") if fecha_guardada else "sin fecha"
        cambios.append(f"fecha de {antes} a {fecha.strftime('%d-%m-%Y')}")

    if not cambios:
        return None, False  # lo normal: no cambió nada y no se toca la base

    propiedad = db.get(Property, guardado.id)
    for columna, valor in nuevos.items():
        setattr(propiedad, columna, valor)
    propiedad.updated_at = datetime.now(ZONA_CHILE)
    db.commit()
    # Cambió el precio o la fecha: se recalcula el semáforo (y se avisa si mejoró de nivel)
    recalcular_semaforo_y_avisar(db, propiedad)
    return ", ".join(cambios), "auction_date" in nuevos


def cargar(remates: list[dict]) -> dict:
    resumen = {
        "creados": 0,
        "ya_existian": 0,
        "nuevos": [],  # paso 118: cuáles se crearon
        "actualizados": [],  # paso 118: cuáles cambiaron de precio o fecha, o volvieron al sitio
        "fecha_cambiada": [],  # paso 118b: números de los que cambiaron de fecha (hay que releer su ficha)
        "sin_comuna": [],
        "sin_precio": [],
        "tipo_desconocido": [],
        "con_error": [],
    }
    db = SessionLocal()
    try:
        # Se leen una sola vez: las comunas de la base y los remates que ya están cargados
        comunas = {normalizar(c.name): c for c in db.query(Comuna).all()}
        # Paso 118: de los ya cargados se guardan sus datos actuales, para ver si el sitio los cambió
        ya_cargados = {
            fila.source_reference: fila
            for fila in db.query(
                Property.id,
                Property.source_reference,
                Property.title,
                Property.status,
                Property.opening_price,
                Property.auction_date,
            ).filter(Property.source_system == FUENTE)
        }

        for remate in remates:
            referencia = remate["remate_id"]
            guardado = ya_cargados.get(referencia)
            if guardado is not None:
                resumen["ya_existian"] += 1
                try:
                    cambio, cambio_la_fecha = actualizar_existente(db, guardado, remate)
                    if cambio:
                        resumen["actualizados"].append(f"{referencia} {guardado.title}: {cambio}")
                        print(f"  ~ {referencia}  {guardado.title}: {cambio}")
                    if cambio_la_fecha:
                        resumen["fecha_cambiada"].append(referencia)
                except Exception as error:
                    db.rollback()
                    resumen["con_error"].append(f"{referencia}: {type(error).__name__}")
                continue

            comuna = comunas.get(normalizar(remate["comuna"]))
            if comuna is None:
                resumen["sin_comuna"].append(f"{referencia} ({remate['comuna']})")
                continue

            if not remate["precio_minimo"]:
                resumen["sin_precio"].append(referencia)
                continue

            tipo_remate = tipo_de_remate(remate["tipo_remate"])
            if tipo_remate is None:
                resumen["tipo_desconocido"].append(f"{referencia} ({remate['tipo_remate']})")
                continue

            try:
                # Se usa la misma función que la API (POST /propiedades): guarda la propiedad,
                # calcula el semáforo y crea las alertas. Así esa lógica no se repite aquí.
                datos = armar_propiedad(remate, comuna, tipo_remate)
                crear_propiedad(datos=datos, db=db, usuario=None)
                resumen["creados"] += 1
                resumen["nuevos"].append(f"{referencia} {datos.title}")
                print(f"  + {referencia}  {datos.title}")
            except HTTPException:
                # 409: otro proceso la cargó mientras tanto
                resumen["ya_existian"] += 1
            except Exception as error:
                # Si alcanzó a guardarse a medias, se borra para que la próxima carga la intente completa
                db.rollback()
                db.query(Property).filter(
                    Property.source_system == FUENTE, Property.source_reference == referencia
                ).delete()
                db.commit()
                resumen["con_error"].append(f"{referencia}: {error}")
    finally:
        db.close()
    return resumen


def mostrar_resumen(resumen: dict):
    print(f"\nCreados: {resumen['creados']}")
    print(f"Ya existían: {resumen['ya_existian']}")
    print(f"Actualizados (precio, fecha o volvieron al sitio): {len(resumen['actualizados'])}")
    for nombre, texto in [
        ("sin_comuna", "Sin comuna en la base"),
        ("sin_precio", "Sin precio mínimo"),
        ("tipo_desconocido", "Tipo de remate desconocido"),
        ("con_error", "Con error"),
    ]:
        print(f"{texto}: {len(resumen[nombre])} {resumen[nombre]}")


def solo_region_metropolitana(remates: list[dict]) -> list[dict]:
    # Solo los remates que el sitio marca como Región Metropolitana
    return [r for r in remates if normalizar(r["region"]).startswith("metropolitana")]


def leer_region_metropolitana() -> list[dict]:
    # Paso 118b: el sitio publica todos sus remates vigentes en una sola página (ver remates_scraper.py),
    # así que ya no se recorre comuna por comuna: se pide una página y se dejan los de la Región Metropolitana.
    return solo_region_metropolitana(leer_remates())


if __name__ == "__main__":
    print("Leyendo los remates del sitio...")
    remates = leer_region_metropolitana()
    print(f"\nSe leyeron {len(remates)} remates distintos. Guardando en la base (puede tardar varios minutos)...")
    mostrar_resumen(cargar(remates))