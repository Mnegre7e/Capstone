# Paso 124a: ubica cada remate en el mapa, con el buscador de direcciones de OpenStreetMap (Nominatim).
#
#   python -m app.scraper.ubicaciones             -> ubica los remates vigentes que todavía no tienen ubicación
#   python -m app.scraper.ubicaciones --prueba 10 -> ubica solo 10, para ver cómo resulta
#   python -m app.scraper.ubicaciones --de-nuevo  -> paso 124e: busca otra vez los que quedaron en el centro de su comuna
#
# La carga diaria (ingesta.py) también lo hace, solo para los remates nuevos o que cambiaron de dirección.
#
# Cómo se ubica un remate:
#   1) De la dirección del sitio se saca la calle y el número (direcciones.py).
#   2) Se busca "calle número, comuna" en OpenStreetMap, solo dentro del rectángulo de esa comuna.
#   3) Si no la encuentra, se busca solo la calle. Si tampoco, queda en el centro de su comuna
#      (en el mapa se muestra como ubicación aproximada).
# Paso 124e: el rectángulo sale del borde de la comuna (datos/comunas-rm.json), y un resultado que queda FUERA de la
# comuna del remate se descarta (a veces OpenStreetMap encuentra una calle con el mismo nombre en la comuna vecina).
# Los remates que ya estaban ubicados fuera de su comuna se buscan otra vez.
# Paso 124f: "con su dirección" solo si se encontró la calle CON su número; si el nombre trae abreviaturas
# ("Dir. Ena Silvia Delgado I. Poniente") se prueba también sin ellas; y si el lector de direcciones (direcciones.py)
# ahora lee distinto una dirección, ese remate se busca otra vez solo.
# Reglas del buscador: máximo 1 búsqueda por segundo, decir quién busca (User-Agent) y guardar los resultados
# para no repetir búsquedas. Datos © colaboradores de OpenStreetMap (licencia ODbL).
import json
import math
import re
import sys
import time
from datetime import datetime, timezone
from functools import lru_cache
from itertools import pairwise
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

from app.database import SessionLocal
from app.models.property import Comuna, Property
from app.models.ubicacion import ComunaUbicacion, PropiedadUbicacion
from app.scraper.direcciones import calle_y_numero, sin_tildes

URL_BUSCADOR = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "HouseGreen/1.0 (proyecto Capstone; housegreen.capstone@gmail.com)", "Accept-Language": "es"}
PAUSA_ENTRE_BUSQUEDAS = 1.1  # segundos: el buscador pide máximo una búsqueda por segundo
MAXIMO_POR_CARGA = 300  # en la carga diaria (unos 6 a 11 minutos como máximo); a mano se ubican todos
RESULTADOS_POR_BUSQUEDA = 5  # paso 124e: se piden varios y se usa el primero que está dentro de la comuna
ZONA_CHILE = ZoneInfo("America/Santiago")
REGION = "Región Metropolitana de Santiago"

# Rectángulo de la Región Metropolitana (oeste, norte, este, sur): se usa si no se conoce el de la comuna
RECTANGULO_RM = "-71.75,-32.85,-69.75,-34.35"
MARGEN = 0.01  # se agranda un poco el rectángulo de la comuna, por si la dirección está justo en el borde
LADO_MINIMO = 0.01  # si el buscador devolvió un rectángulo más chico que esto (casi un punto)...
MEDIO_LADO = 0.03  # ...se usa uno de ±0,03° alrededor del centro (unos 3 km)

# Paso 124e: el borde de las 52 comunas de la Región Metropolitana (Biblioteca del Congreso Nacional, simplificado).
# Es el mismo archivo que usa la web (housegreen-web/public/mapas/comunas-rm.json): si se cambia uno, se cambia el otro.
ARCHIVO_COMUNAS = Path(__file__).parent / "datos" / "comunas-rm.json"
TOLERANCIA_METROS = 150  # hasta 150 m fuera del borde cuenta como dentro (calles del límite y bordes simplificados)
METROS_POR_GRADO_LATITUD = 111_320
METROS_POR_GRADO_LONGITUD = 92_800  # a la latitud de Santiago (33,5° sur)

# Resultados que son un área (un barrio, una ciudad) y no una calle: no sirven como ubicación del remate
TIPOS_DE_AREA = {
    "country", "state", "region", "province", "county", "municipality", "city", "town", "village", "hamlet",
    "city_district", "district", "borough", "suburb", "quarter", "neighbourhood", "isolated_dwelling", "postcode",
}


class BuscadorNoResponde(Exception):
    """El buscador de OpenStreetMap no respondió (sin internet, demasiadas búsquedas...): se para y se sigue otro día."""


def buscar_varios(limite: int = 1, **parametros) -> list[dict]:
    """Hace una búsqueda en OpenStreetMap y devuelve hasta `limite` resultados (lista vacía si no encontró nada)."""
    try:
        respuesta = requests.get(
            URL_BUSCADOR,
            params={**parametros, "format": "jsonv2", "addressdetails": 1, "limit": limite, "countrycodes": "cl"},
            headers=HEADERS,
            timeout=20,
        )
        respuesta.raise_for_status()
        resultados = respuesta.json()
    except (requests.RequestException, ValueError) as error:
        raise BuscadorNoResponde(f"{type(error).__name__}: {error}"[:300]) from error
    finally:
        time.sleep(PAUSA_ENTRE_BUSQUEDAS)  # la pausa va siempre, también si falló
    return resultados if isinstance(resultados, list) else []


def buscar(**parametros) -> dict | None:
    """El primer resultado de una búsqueda en OpenStreetMap (o None si no encontró nada)."""
    resultados = buscar_varios(**parametros)
    return resultados[0] if resultados else None


def _dentro_de_la_rm(latitud: float, longitud: float) -> bool:
    return -34.35 <= latitud <= -32.85 and -71.75 <= longitud <= -69.75


# ---------- Paso 124e: el borde de cada comuna ----------


def nombre_comparable(nombre: str) -> str:
    """ "Estación Central" y "estacion central" son la misma comuna (sin tildes, espacios ni mayúsculas)."""
    return "".join(letra for letra in sin_tildes(nombre or "") if letra.isalnum())


@lru_cache(maxsize=1)
def bordes_de_comunas() -> dict[str, list[list[tuple[float, float]]]]:
    """{"providencia": [anillo, ...]}: cada anillo es una lista de (longitud, latitud). Vacío si falta el archivo."""
    try:
        datos = json.loads(ARCHIVO_COMUNAS.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return {
        nombre_comparable(f["properties"]["nombre"]): [[(x, y) for x, y in anillo] for anillo in f["geometry"]["coordinates"]]
        for f in datos.get("features", [])
    }


def _distancia_al_origen(x1: float, y1: float, x2: float, y2: float) -> float:
    """Distancia (en metros) desde el punto (0, 0) hasta el trazo que va de (x1, y1) a (x2, y2)."""
    dx, dy = x2 - x1, y2 - y1
    largo = dx * dx + dy * dy
    t = 0.0 if largo == 0 else max(0.0, min(1.0, -(x1 * dx + y1 * dy) / largo))
    return math.hypot(x1 + t * dx, y1 + t * dy)


def dentro_de_la_comuna(latitud: float, longitud: float, nombre_comuna: str) -> bool | None:
    """True si el punto está dentro de la comuna (o a menos de 150 m de su borde) y False si está fuera.
    None si no se conoce el borde de esa comuna (entonces no se descarta nada)."""
    anillos = bordes_de_comunas().get(nombre_comparable(nombre_comuna))
    if not anillos:
        return None
    adentro = False
    distancia = math.inf
    for anillo in anillos:
        # Cada esquina del borde en metros, medida desde el punto (así el punto queda en 0, 0)
        esquinas = [
            ((x - longitud) * METROS_POR_GRADO_LONGITUD, (y - latitud) * METROS_POR_GRADO_LATITUD) for x, y in anillo
        ]
        for (x1, y1), (x2, y2) in pairwise(esquinas):
            # Una línea que sale del punto hacia el este: cada vez que cruza el borde, pasa de afuera a adentro o al revés
            if (y1 > 0) != (y2 > 0) and x1 - y1 * (x2 - x1) / (y2 - y1) > 0:
                adentro = not adentro
            distancia = min(distancia, _distancia_al_origen(x1, y1, x2, y2))
    return adentro or distancia <= TOLERANCIA_METROS


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


def rectangulo_de(nombre_comuna: str, ubicacion: ComunaUbicacion | None) -> str:
    """El rectángulo donde se buscan las direcciones de esa comuna, como lo pide el buscador: "oeste,norte,este,sur".
    Paso 124e: sale del borde de la comuna (antes, el buscador a veces daba uno muy chico y no encontraba la calle)."""
    anillos = bordes_de_comunas().get(nombre_comparable(nombre_comuna))
    if anillos:
        longitudes = [x for anillo in anillos for x, _ in anillo]
        latitudes = [y for anillo in anillos for _, y in anillo]
        oeste, este, sur, norte = min(longitudes), max(longitudes), min(latitudes), max(latitudes)
    elif ubicacion is None:
        return RECTANGULO_RM
    else:
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


# Paso 124f: abreviaturas y letras sueltas del nombre de una calle ("Dir.", "Gral.", "I.")
ABREVIATURA = re.compile(r"(?<!\S)(?:[A-Za-zÁÉÍÓÚÑáéíóúñ]{1,5}\.|[A-Za-zÁÉÍÓÚÑáéíóúñ])(?!\S)")


def textos_de_busqueda(direccion: str | None, nombre_comuna: str) -> list[tuple[str, bool]]:
    """Lo que se busca en OpenStreetMap, en orden, y si lleva el número:
    [("San Petersburgo 6351, San Miguel", True), ("San Petersburgo, San Miguel", False)].
    Paso 124f: si el nombre trae abreviaturas, se prueba también sin ellas ("Ena Silvia Delgado Poniente")."""
    partes = calle_y_numero(direccion)
    if not partes:
        return []
    calle, numero = partes
    nombres = [calle]
    sin_abreviaturas = re.sub(r"\s+", " ", ABREVIATURA.sub(" ", calle)).strip()
    if sin_abreviaturas != calle and len(sin_abreviaturas) >= 3:
        nombres.append(sin_abreviaturas)
    textos = [(f"{nombre} {numero}, {nombre_comuna}", True) for nombre in nombres] if numero else []
    return textos + [(f"{nombre}, {nombre_comuna}", False) for nombre in nombres]  # si no está el número, la calle


def ubicar_propiedad(
    propiedad: Property,
    comuna: Comuna | None,
    ubicacion_comuna: ComunaUbicacion | None,
    descartados: list[str] | None = None,
) -> PropiedadUbicacion:
    """Busca dónde está el remate. Siempre devuelve una fila (si no lo encuentra, queda en el centro de la comuna).
    descartados: aquí se anotan los resultados que se descartaron por quedar en otra comuna."""
    nombre_comuna = comuna.name if comuna else ""
    acotado = {"viewbox": rectangulo_de(nombre_comuna, ubicacion_comuna), "bounded": 1}
    buscado = None

    for texto, con_numero in textos_de_busqueda(propiedad.address, nombre_comuna):
        buscado = texto
        for resultado in buscar_varios(limite=RESULTADOS_POR_BUSQUEDA, q=f"{texto}, Chile", **acotado):
            if _es_un_area(resultado):
                continue
            latitud, longitud = float(resultado["lat"]), float(resultado["lon"])
            # Paso 124e: si quedó en otra comuna, es otra calle con el mismo nombre: se prueba el siguiente
            if dentro_de_la_comuna(latitud, longitud, nombre_comuna) is False:
                if descartados is not None:
                    descartados.append(texto)
                continue
            return PropiedadUbicacion(
                property_id=propiedad.id,
                latitude=latitud,
                longitude=longitud,
                # Paso 124f: "con su dirección" solo si se buscó con el número (si no, es la calle)
                accuracy="direccion" if con_numero and _es_exacta(resultado) else "calle",
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


def actualizar_ubicaciones(maximo: int | None = None, mostrar: bool = False, de_nuevo: bool = False) -> dict:
    """Ubica los remates vigentes que no tienen ubicación (o que cambiaron de dirección).
    maximo: cuántos como máximo (None = todos). mostrar: escribe en la terminal cada remate que ubica.
    de_nuevo: paso 124e, busca otra vez también los que quedaron en el centro de su comuna."""
    resumen = {
        "buscadas": 0, "direccion": 0, "calle": 0, "comuna": 0, "sin_ubicacion": 0,
        "comunas_nuevas": 0, "quedan": 0, "detenida": None, "con_error": [],
        "fuera_de_su_comuna": 0,  # paso 124e: ya estaban ubicados en otra comuna (se buscan otra vez)
        "descartados": 0,  # paso 124e: remates en que el buscador dio un resultado en otra comuna
        "lectura_nueva": 0,  # paso 124f: el lector de direcciones ahora los lee distinto (se buscan otra vez)
    }
    db = SessionLocal()
    try:
        hoy = datetime.now(ZONA_CHILE).replace(hour=0, minute=0, second=0, microsecond=0)
        vigentes = (
            db.query(Property)
            .filter(Property.removed_at.is_(None), Property.status != "retirada")
            .filter(Property.duplicate_of.is_(None))  # paso 124d: los repetidos no se buscan (se muestra el original)
            .filter((Property.auction_date.is_(None)) | (Property.auction_date >= hoy))
            .order_by(Property.created_at.desc())  # primero los más nuevos
            .all()
        )
        comunas = {comuna.id: comuna for comuna in db.query(Comuna)}
        ya_ubicadas = {fila.property_id: fila for fila in db.query(PropiedadUbicacion)}

        def hay_que_buscar(propiedad: Property) -> bool:
            fila = ya_ubicadas.get(propiedad.id)
            if fila is None or fila.address_used != (propiedad.address or ""):
                return True  # nunca se ubicó, o cambió de dirección desde la última vez
            comuna = comunas.get(propiedad.comuna_id)
            nombre_comuna = comuna.name if comuna else ""
            # Paso 124f: lo que se buscaría hoy con esa dirección ({texto: si lleva el número})
            textos = {texto[:300]: con_numero for texto, con_numero in textos_de_busqueda(propiedad.address, nombre_comuna)}
            guardado = fila.searched_text or None
            if fila.accuracy in ("direccion", "calle") and fila.latitude is not None:
                # Paso 124f: el lector ahora lee otra calle, o quedó "con su dirección" sin haber buscado el número
                if guardado not in textos or (fila.accuracy == "direccion" and not textos[guardado]):
                    resumen["lectura_nueva"] += 1
                    return True
                # Paso 124e: se ubicó antes de revisar la comuna y quedó en otra: se busca otra vez
                if dentro_de_la_comuna(fila.latitude, fila.longitude, nombre_comuna) is False:
                    resumen["fuera_de_su_comuna"] += 1
                    return True
                return False
            # En el centro de su comuna (o sin ubicación): se busca otra vez si hoy se probaría algo nuevo
            if guardado != (list(textos)[-1] if textos else None):
                resumen["lectura_nueva"] += 1
                return True
            return de_nuevo  # con --de-nuevo se buscan otra vez igual

        por_ubicar = [p for p in vigentes if hay_que_buscar(p)]
        resumen["quedan"] = len(por_ubicar)
        if maximo is not None:
            por_ubicar = por_ubicar[:maximo]
        if mostrar and resumen["fuera_de_su_comuna"]:
            print(f"   {resumen['fuera_de_su_comuna']} estaban ubicados fuera de su comuna: se buscan otra vez.")
        if mostrar and resumen["lectura_nueva"]:
            print(f"   {resumen['lectura_nueva']} se leen distinto que antes (o les faltaba el número): se buscan otra vez.")

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

            descartados: list[str] = []
            fila = ubicar_propiedad(propiedad, comuna, ubicaciones_comunas.get(propiedad.comuna_id), descartados)
            db.merge(fila)  # crea la fila, o la reemplaza si el remate cambió de dirección
            db.commit()
            resumen["buscadas"] += 1
            resumen[fila.accuracy] += 1
            if descartados:
                resumen["descartados"] += 1
            if mostrar:
                comuna_texto = comuna.name if comuna else "sin comuna"
                aviso = "  (descartado en otra comuna: " + "; ".join(descartados) + ")" if descartados else ""
                print(f"   [{numero}/{len(por_ubicar)}] {fila.accuracy:<13} {comuna_texto:<20} {fila.searched_text or '-'}{aviso}")
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
    if resumen.get("descartados"):
        print(f"   En {resumen['descartados']} el buscador dio un lugar de otra comuna (se descartó).")
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
    if not bordes_de_comunas():
        print(f"   Aviso: no se encontró {ARCHIVO_COMUNAS}: no se revisa si cada punto queda en su comuna.")
    mostrar_resumen(actualizar_ubicaciones(maximo=cuantos, mostrar=True, de_nuevo="--de-nuevo" in sys.argv))