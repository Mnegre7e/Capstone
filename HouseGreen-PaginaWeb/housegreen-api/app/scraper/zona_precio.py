# Paso 120b: el factor "Precio" del semáforo se calcula solo, sin que el administrador elija la zona.
#
# Se compara el precio mínimo del remate con el precio típico (mediana) de las propiedades del mismo tipo
# EN VENTA en su comuna, que publica PropiedadesYa (paso 120a):
#     descuento = 1 − precio mínimo ÷ precio típico
#     verde: 40 % o más bajo · amarilla: 15 % a 39,9 % bajo · roja: menos de 15 % (o más caro)
# Solo departamentos y casas, y solo si la fuente usó al menos 20 avisos de ese tipo en la comuna.
# Si no hay referencia, la zona queda vacía (el factor vale 0 puntos, como cualquier dato que falta).
#
# La zona se guarda en property_financial_info.market_zone, la misma columna que usa la función
# calculate_score de la base: así el cálculo del semáforo no cambia.
#
#   python -m app.scraper.zona_precio   -> recalcula ahora la zona de precio de todos los remates vigentes
#
# La carga diaria (ingesta.py) también lo hace al final, todos los días.
import re
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from app.database import SessionLocal
from app.models.precio_comuna import ComunaMarketPrice
from app.models.property import Comuna, Property, PropertyFinancialInfo
from app.routers.alerts import recalcular_semaforo_y_avisar

ZONA_CHILE = ZoneInfo("America/Santiago")
FUENTE_REMATES = "rematesinmobiliarios"

MINIMO_DE_AVISOS = 20
CORTE_VERDE = Decimal("0.40")  # 40 % o más bajo el precio típico
CORTE_AMARILLA = Decimal("0.15")  # entre 15 % y 39,9 %

NOMBRE_EN_PLURAL = {"departamento": "departamentos", "casa": "casas"}


def tipo_para_comparar(property_type: str | None) -> str | None:
    # Igual que las categorías de la web (tipoPropiedad.ts): primero se descartan derechos y parcelas,
    # porque "parcela con casa" o "derechos sobre una casa" no se comparan con una casa completa.
    texto = (property_type or "").lower()
    if re.search(r"derecho|usufructo|nuda propiedad|parcela|predio|fundo|hijuela|agr[ií]cola", texto):
        return None
    if re.search(r"casa|vivienda", texto):
        return "casa"
    if "departamento" in texto:
        return "departamento"
    return None


def zona_del_descuento(descuento: Decimal) -> str:
    if descuento >= CORTE_VERDE:
        return "verde"
    if descuento >= CORTE_AMARILLA:
        return "amarillo"
    return "rojo"


def comparar(property_type: str | None, precio_minimo, comuna_nombre: str | None, referencia: ComunaMarketPrice | None) -> dict:
    """Compara un remate con el precio típico de su comuna. Devuelve un diccionario:
    - disponible = False y un "motivo" en palabras, si no se puede comparar;
    - disponible = True con el precio típico, el descuento (en %) y la zona, si se puede."""
    tipo = tipo_para_comparar(property_type)
    if tipo is None:
        return {"disponible": False, "motivo": "Por ahora el precio solo se compara en departamentos y casas."}
    plural = NOMBRE_EN_PLURAL[tipo]
    if referencia is None:
        return {
            "disponible": False,
            "tipo": tipo,
            "motivo": f"No hay un precio típico publicado de {plural} en venta en {comuna_nombre or 'esta comuna'}.",
        }
    if referencia.sample_size < MINIMO_DE_AVISOS or not referencia.median_clp:
        return {
            "disponible": False,
            "tipo": tipo,
            "motivo": (
                f"En {comuna_nombre or 'esta comuna'} hay solo {referencia.sample_size} avisos de {plural} en venta: "
                f"muy pocos para un precio típico confiable (se piden al menos {MINIMO_DE_AVISOS})."
            ),
        }
    precio = Decimal(str(precio_minimo))
    tipico = Decimal(str(referencia.median_clp))
    descuento = 1 - precio / tipico
    return {
        "disponible": True,
        "tipo": tipo,
        "etiqueta": referencia.label,
        "comuna": comuna_nombre,
        "precio_minimo_clp": precio,
        "precio_tipico_clp": tipico,
        "precio_tipico_uf": referencia.median_uf,
        "avisos": referencia.sample_size,
        "superficie_tipica_m2": referencia.median_surface_m2,
        "descuento_pct": float(round(descuento * 100, 1)),  # 48.0 = 48 % bajo; negativo = más caro
        "zona": zona_del_descuento(descuento),
        "fuente": referencia.source,
        "fuente_url": referencia.source_url,
        "fecha": referencia.source_date,
    }


def referencias(db) -> dict:
    # (comuna_id, tipo) -> precio típico, para no consultar la base una vez por cada remate
    return {(fila.comuna_id, fila.kind): fila for fila in db.query(ComunaMarketPrice)}


def actualizar_zonas() -> dict:
    """Recalcula la zona de precio de todos los remates vigentes. Solo toca la base (y recalcula el semáforo)
    cuando la zona cambia; la primera vez cambian casi todos, después solo los nuevos o los que cambiaron de precio."""
    resumen = {"revisados": 0, "cambiados": 0, "verde": 0, "amarillo": 0, "rojo": 0, "sin_referencia": 0, "con_error": []}
    db = SessionLocal()
    try:
        precios = referencias(db)
        comunas = dict(db.query(Comuna.id, Comuna.name).all())
        hoy = datetime.now(ZONA_CHILE).replace(hour=0, minute=0, second=0, microsecond=0)
        vigentes = (
            db.query(Property.id, Property.comuna_id, Property.property_type, Property.opening_price)
            .filter(Property.source_system == FUENTE_REMATES, Property.removed_at.is_(None))
            .filter(Property.status != "retirada")
            .filter((Property.auction_date.is_(None)) | (Property.auction_date >= hoy))
            .all()
        )
        zonas_actuales = dict(db.query(PropertyFinancialInfo.property_id, PropertyFinancialInfo.market_zone).all())

        for propiedad_id, comuna_id, property_type, precio_minimo in vigentes:
            resumen["revisados"] += 1
            tipo = tipo_para_comparar(property_type)
            comparacion = comparar(property_type, precio_minimo, comunas.get(comuna_id), precios.get((comuna_id, tipo)))
            nueva = comparacion["zona"] if comparacion["disponible"] else None
            resumen[nueva or "sin_referencia"] += 1
            if zonas_actuales.get(propiedad_id) == nueva:
                continue  # lo normal: no cambió nada
            try:
                financiero = db.query(PropertyFinancialInfo).filter_by(property_id=propiedad_id).first()
                if not financiero:
                    financiero = PropertyFinancialInfo(property_id=propiedad_id)
                    db.add(financiero)
                financiero.market_zone = nueva
                db.flush()  # se envía a la base, pero se confirma junto con el semáforo (todo o nada)
                # Cambió la zona: se recalcula el semáforo (y se avisa a quien tenga una alerta, si mejoró)
                recalcular_semaforo_y_avisar(db, db.get(Property, propiedad_id))
                resumen["cambiados"] += 1
                if resumen["cambiados"] % 50 == 0:
                    print(f"   ... {resumen['cambiados']} zonas cambiadas")
            except Exception as error:
                db.rollback()
                resumen["con_error"].append(f"{propiedad_id}: {type(error).__name__}")
    finally:
        db.close()
    return resumen


def mostrar_resumen(resumen: dict) -> None:
    print(
        f"Remates vigentes revisados: {resumen['revisados']} | zona cambiada: {resumen['cambiados']} | "
        f"verde {resumen['verde']} · amarilla {resumen['amarillo']} · roja {resumen['rojo']} · "
        f"sin referencia {resumen['sin_referencia']}"
    )
    if resumen["con_error"]:
        print("Con error:", len(resumen["con_error"]), resumen["con_error"][:10])


if __name__ == "__main__":
    print("Calculando la zona de precio de los remates vigentes...")
    mostrar_resumen(actualizar_zonas())
