# Paso 124a: ubica cada remate en el mapa, con el buscador de direcciones de OpenStreetMap (Nominatim).
#
#   python -m app.scraper.ubicaciones             -> ubica los remates vigentes que todavía no tienen ubicación
#   python -m app.scraper.ubicaciones --prueba 10 -> ubica solo 10, para ver cómo resulta
#
# La carga diaria (ingesta.py) también lo hace, solo para los remates nuevos o que cambiaron de dirección.
#
# Cómo se ubica un remate:
#   1) De la dirección del sitio se saca la calle y el número (direcciones.py).
#   2) Se busca "calle número, comuna" en OpenStreetMap, solo dentro del rectángulo de esa comuna.
#   3) Si no la encuentra, se busca solo la calle. Si tampoco, queda en el centro de su comuna
#      (en el mapa se muestra como ubicación aproximada).
# Reglas del buscador: máximo 1 búsqueda por segundo, decir quién busca (User-Agent) y guardar los resultados
# para no repetir búsquedas. Datos © colaboradores de OpenStreetMap (licencia ODbL).
import sys
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import requests

from app.database import SessionLocal
from app.models.property import Comuna, Property
from app.models.ubicacion import ComunaUbicacion, PropiedadUbicacion
from app.scraper.direcciones import calle_y_numero

URL_BUSCADOR = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "HouseGreen/1.0 (proyecto Capstone; housegreen.capstone@gmail.com)", "Accept-Language": "es"}
PAUSA_ENTRE_BUSQUEDAS = 1.1  # segundos: el buscador pide máximo una búsqueda por segundo
MAXIMO_POR_CARGA = 300  # en la carga diaria (unos 6 a 11 minutos como máximo); a mano se ubican todos
ZONA_CHILE = ZoneInfo("America/Santiago")
REGION = "Región Metropolitana de Santiago"

# Rectángulo de la Región Metropolitana (oeste, norte, este, sur): se usa si no se conoce el de la comuna
RECTANGULO_RM = "-71.75,-32.85,-69.75,-34.35"
MARGEN = 0.01  # se agranda un poco el rectángulo de la comuna, por si la dirección está justo en el borde
LADO_MINIMO = 0.01  # si el buscador devolvió un rectángulo más chico que esto (casi un punto)...
MEDIO_LADO = 0.03  # ...se usa uno de ±0,03° alrededor del centro (unos 3 km)

# Resultados que son un área (un barrio, una ciudad) y no una calle: no sirven como ubicación del remate
TIPOS_DE_AREA = {
    "country", "state", "region", "province", "county", "municipality", "city", "town", "village", "hamlet",
    "city_district", "district", "borough", "suburb", "quarter", "neighbourhood", "isolated_dwelling", "postcode",
}


class BuscadorNoResponde(Exception):
    """El buscador de OpenStreetMap no respondió (sin internet, demasiadas búsquedas...): se para y se sigue otro día."""


def buscar(**parametros) -> dict | None:
    """Hace una búsqueda en OpenStreetMap y devuelve el primer resultado (o None si no encontró nada)."""
    try:
        respuesta = requests.get(
            URL_BUSCADOR,
            params={**parametros, "format": "jsonv2", "addressdetails": 1, "limit": 1, "countrycodes": "cl"},
            headers=HEADERS,
            timeout=20,
        )
        respuesta.raise_for_status()
        resultados = respuesta.json()
    except (requests.RequestException, ValueError) as error:
        raise BuscadorNoResponde(f"{type(error).__name__}: {error}"[:300]) from error
    finally:
        time.sleep(PAUSA_ENTRE_BUSQUEDAS)  # la pausa va siempre, también si falló
    return resultados[0] if isinstance(resultados, list) and resultados else None


def _dentro_de_la_rm(latitud: float, longitud: float) -> bool:
    return -34.35 <= latitud <= -32.85 and -71.75 <= longitud <= -69.75


def ubicar_comuna(comuna: Comuna) -> ComunaUbicacion | None:
    """Centro y rectángulo de la comuna. None si el buscador no la encuentra dentro de la Región Metropolitana."""
    texto = f"{comuna.name}, {REGION}, Chile"
    resultado = buscar(q=texto, featureType="city") or buscar(q=texto)
    if not resultado:
        return None
    latitud, longitud = float(resultado["lat"]), float(resultado["lon"])
    if not _dentro_de_la_rm(latitud, longitud):
        return None
    sur, norte, oeste, este = (float(valor) for valor in resultado.get("boundingbox") or [latitud] * 2 + [longitud] * 2)
    return ComunaUbicacion(
        comuna_id=comuna.id, latitude=latitud, longitude=longitud, south=sur, north=norte, west=oeste, east=este
    )


def rectangulo_de(ubicacion: ComunaUbicacion | None) -> str:
    """El rectángulo donde se buscan las direcciones de esa comuna, como lo pide el buscador: "oeste,norte,este,sur"."""
    if ubicacion is None:
        return RECTANGULO_RM
    sur, norte, oeste, este = ubicacion.south, ubicacion.north, ubicacion.west, ubicacion.east
    if None in (sur, norte, oeste, este) or norte - sur < LADO_MINIMO or este - oeste < LADO_MINIMO:
        sur, norte = ubicacion.latitude - MEDIO_LADO, ubicacion.latitude + MEDIO_LADO
        oeste, este = ubicacion.longitude - MEDIO_LADO, ubicacion.longitude + MEDIO_LADO
    return f"{oeste - MARGEN},{norte + MARGEN},{este + MARGEN},{sur - MARGEN}"


def _es_un_area(resultado: dict) -> bool:
    return resultado.get("category") == "boundary" or resultado.get("addresstype") in TIPOS_DE_AREA


def _es_exacta(resultado: dict) -> bool:
    """True si encontró la casa o el edificio (y no solo la calle)."""
    direccion = resultado.get("address") or {}
    return bool(direccion.get("house_number")) or resultado.get("category") == "building" or resultado.get("type") in (
        "house",
        "building",
        "apartments",
    )


def ubicar_propiedad(propiedad: Property, comuna: Comuna | None, ubicacion_comuna: ComunaUbicacion | None) -> PropiedadUbicacion:
    """Busca dónde está el remate. Siempre devuelve una fila (si no lo encuentra, queda en el centro de la comuna)."""
    nombre_comuna = comuna.name if comuna else ""
    acotado = {"viewbox": rectangulo_de(ubicacion_comuna), "bounded": 1}
    partes = calle_y_numero(propiedad.address)
    buscado = None

    if partes:
        calle, numero = partes
        busquedas = [f"{calle} {numero}, {nombre_comuna}"] if numero else []
        busquedas.append(f"{calle}, {nombre_comuna}")  # si no encuentra el número, al menos la calle
        for texto in busquedas:
            buscado = texto
            resultado = buscar(q=f"{texto}, Chile", **acotado)
            if resultado and not _es_un_area(resultado):
                return PropiedadUbicacion(
                    property_id=propiedad.id,
                    latitude=float(resultado["lat"]),
                    longitude=float(resultado["lon"]),
                    accuracy="direccion" if numero and _es_exacta(resultado) else "calle",
                    searched_text=texto[:300],
                    address_used=propiedad.address or "",
                    geocoded_at=datetime.now(timezone.utc),
                )

    # No se encontró la calle: queda en el centro de la comuna (o sin ubicación, si tampoco se conoce la comuna)
    return PropiedadUbicacion(
        property_id=propiedad.id,
        latitude=ubicacion_comuna.latitude if ubicacion_comuna else None,
        longitude=ubicacion_comuna.longitude if ubicacion_comuna else None,
        accuracy="comuna" if ubicacion_comuna else "sin_ubicacion",
        searched_text=(buscado or "")[:300] or None,
        address_used=propiedad.address or "",
        geocoded_at=datetime.now(timezone.utc),
    )


def actualizar_ubicaciones(maximo: int | None = None, mostrar: bool = False) -> dict:
    """Ubica los remates vigentes que no tienen ubicación (o que cambiaron de dirección).
    maximo: cuántos como máximo (None = todos). mostrar: escribe en la terminal cada remate que ubica."""
    resumen = {
        "buscadas": 0, "direccion": 0, "calle": 0, "comuna": 0, "sin_ubicacion": 0,
        "comunas_nuevas": 0, "quedan": 0, "detenida": None, "con_error": [],
    }
    db = SessionLocal()
    try:
        hoy = datetime.now(ZONA_CHILE).replace(hour=0, minute=0, second=0, microsecond=0)
        vigentes = (
            db.query(Property)
            .filter(Property.removed_at.is_(None), Property.status != "retirada")
            .filter((Property.auction_date.is_(None)) | (Property.auction_date >= hoy))
            .order_by(Property.created_at.desc())  # primero los más nuevos
            .all()
        )
        ya_ubicadas = dict(db.query(PropiedadUbicacion.property_id, PropiedadUbicacion.address_used).all())
        # Los que nunca se ubicaron y los que cambiaron de dirección desde la última vez
        por_ubicar = [p for p in vigentes if p.id not in ya_ubicadas or ya_ubicadas[p.id] != (p.address or "")]
        resumen["quedan"] = len(por_ubicar)
        if maximo is not None:
            por_ubicar = por_ubicar[:maximo]

        comunas = {comuna.id: comuna for comuna in db.query(Comuna)}
        ubicaciones_comunas = {fila.comuna_id: fila for fila in db.query(ComunaUbicacion)}
        no_encontradas = set()  # comunas que el buscador no encontró (no se buscan otra vez en esta carga)

        for numero, propiedad in enumerate(por_ubicar, start=1):
            comuna = comunas.get(propiedad.comuna_id)
            if comuna and comuna.id not in ubicaciones_comunas and comuna.id not in no_encontradas:
                ubicacion_comuna = ubicar_comuna(comuna)
                if ubicacion_comuna:
                    db.add(ubicacion_comuna)
                    db.commit()
                    ubicaciones_comunas[comuna.id] = ubicacion_comuna
                    resumen["comunas_nuevas"] += 1
                else:
                    no_encontradas.add(comuna.id)

            fila = ubicar_propiedad(propiedad, comuna, ubicaciones_comunas.get(propiedad.comuna_id))
            db.merge(fila)  # crea la fila, o la reemplaza si el remate cambió de dirección
            db.commit()
            resumen["buscadas"] += 1
            resumen[fila.accuracy] += 1
            if mostrar:
                comuna_texto = comuna.name if comuna else "sin comuna"
                print(f"   [{numero}/{len(por_ubicar)}] {fila.accuracy:<13} {comuna_texto:<20} {fila.searched_text or '-'}")
    except BuscadorNoResponde as error:
        db.rollback()
        resumen["detenida"] = f"El buscador de OpenStreetMap no respondió: {error}"[:300]
        resumen["con_error"].append(resumen["detenida"])
    finally:
        db.close()
    resumen["quedan"] -= resumen["buscadas"]  # los que quedan para la próxima vez
    return resumen


def mostrar_resumen(resumen: dict) -> None:
    print(
        f"   Ubicados {resumen['buscadas']}: {resumen['direccion']} con su dirección, {resumen['calle']} en su calle, "
        f"{resumen['comuna']} en el centro de su comuna, {resumen['sin_ubicacion']} sin ubicación."
    )
    if resumen["comunas_nuevas"]:
        print(f"   Comunas nuevas en el mapa: {resumen['comunas_nuevas']}")
    if resumen["quedan"]:
        print(f"   Quedan {resumen['quedan']} por ubicar (se siguen en la próxima carga).")
    if resumen["detenida"]:
        print("   " + resumen["detenida"])


if __name__ == "__main__":
    cuantos = None
    if "--prueba" in sys.argv:
        posicion = sys.argv.index("--prueba")
        cuantos = int(sys.argv[posicion + 1]) if len(sys.argv) > posicion + 1 else 10
    print("Ubicando los remates en el mapa (OpenStreetMap). Es una búsqueda por segundo: puede tardar varios minutos.")
    mostrar_resumen(actualizar_ubicaciones(maximo=cuantos, mostrar=True))