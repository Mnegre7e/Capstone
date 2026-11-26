import math
import os
import time
from urllib.parse import urlencode
from uuid import UUID

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import requerir_premium
from app.database import get_db
from app.models.property import Property
from app.models.ubicacion import PropiedadUbicacion
from app.schemas.vista_calle import VistaCalleOut
from app.scraper.direcciones import calle_y_numero

# Pasos 135 a 135d: la FOTO PRINCIPAL del remate, con Google.
#
# Servicios de Google que se usan (todos con la clave GOOGLE_MAPS_EMBED_KEY, salvo la búsqueda de fotos):
# - Maps Embed API (ficha): el visor que se puede girar. Gratis y sin límite.
# - Street View Static API, búsqueda de fotos ("metadata"): dice qué foto de calle hay cerca de una dirección.
#   Gratis y sin límite (no consume cuota). La hace la API con GOOGLE_MAPS_SERVER_KEY (clave solo del servidor).
# - Street View Static API, imagen fija (catálogo, paso 135d): Google apunta la cámara a la dirección por sí solo.
#   Gratis hasta 10.000 imágenes al mes; el proyecto de Google Cloud tiene un TOPE DIARIO para no pasarse nunca.
#   Si una imagen no carga (sin foto o tope alcanzado), la tarjeta muestra la foto o el dibujo de siempre.
# Reglas de Google: las imágenes van con su marca, no se descargan ni se guardan, y los códigos de panorama no se
# guardan en la base (pueden cambiar): se buscan en el momento a partir de la dirección.
router = APIRouter(prefix="/propiedades", tags=["Propiedades"])

URL_VISTA_CALLE = "https://www.google.com/maps/embed/v1/streetview"
URL_MAPA = "https://www.google.com/maps/embed/v1/place"
URL_IMAGEN_FIJA = "https://maps.googleapis.com/maps/api/streetview"
URL_BUSCAR_FOTO = "https://maps.googleapis.com/maps/api/streetview/metadata"
CAMPO_DE_VISION = 80  # grados (Google acepta de 10 a 100): un poco más cerca que el valor por omisión (90)
ACERCAMIENTO_CALLE = 17  # el mapa muestra unas pocas cuadras alrededor del punto
ACERCAMIENTO_COMUNA = 14  # sin calle, el mapa muestra el sector
RADIO_FOTO_METROS = 60  # con coordenadas, la foto de calle más cercana dentro de este radio
TAMANO_IMAGEN_FIJA = "640x360"  # 16:9, como la foto de las tarjetas
SEGUNDOS_EN_MEMORIA = 6 * 3600  # una búsqueda de foto se reutiliza unas horas (solo en memoria, no en la base)


def clave_de_google() -> str:
    """La clave de Google para el navegador (visor y catálogo). Vacía si el equipo todavía no la configura."""
    return (os.getenv("GOOGLE_MAPS_EMBED_KEY") or "").strip()


def clave_del_servidor() -> str:
    """Paso 135d: la clave que usa solo la API para buscar la foto más cercana (no va nunca en la página)."""
    return (os.getenv("GOOGLE_MAPS_SERVER_KEY") or "").strip()


def url_vista_calle(latitud: float, longitud: float, clave: str) -> str:
    """Dirección del visor de la vista de calle para ese punto. Las coordenadas van con 6 decimales (~10 cm)."""
    parametros = {
        "key": clave,
        "location": f"{latitud:.6f},{longitud:.6f}",
        "fov": CAMPO_DE_VISION,
        "language": "es",
        "region": "CL",
    }
    return f"{URL_VISTA_CALLE}?{urlencode(parametros)}"


def url_vista_panorama(pano: str, clave: str, rumbo_grados: float | None = None) -> str:
    """Paso 135d: el visor en una foto de calle concreta y, si se conoce, mirando hacia la propiedad."""
    parametros = {"key": clave, "pano": pano, "fov": CAMPO_DE_VISION, "language": "es", "region": "CL"}
    if rumbo_grados is not None:
        parametros["heading"] = round(rumbo_grados)
    return f"{URL_VISTA_CALLE}?{urlencode(parametros)}"


def texto_para_google(direccion: str | None, nombre_comuna: str | None) -> tuple[str, bool]:
    """Lo que se busca en Google y si trae al menos la calle.
    "Unidad 48, calle Alicante 06048, condominio Alcázar, Colina" -> ("Alicante 06048, Colina, Región
    Metropolitana, Chile", True). El 0 inicial del número se mantiene: en Chile indica el otro lado del eje."""
    partes = calle_y_numero(direccion)
    if partes:
        calle, numero = partes
        base, con_calle = (f"{calle} {numero}" if numero else calle), True
    else:
        # Sin calle reconocible ("Parcela 12, sector Los Quillayes"): se busca el texto tal como viene
        base, con_calle = ((direccion or "").strip()[:150] or None), False
    trozos = [t for t in (base, nombre_comuna, "Región Metropolitana", "Chile") if t]
    return ", ".join(trozos), con_calle


def url_mapa(texto: str, con_calle: bool, clave: str) -> str:
    """Dirección del mapa de Google con un marcador en lo que Google encuentre para ese texto."""
    parametros = {
        "key": clave,
        "q": texto,
        "zoom": ACERCAMIENTO_CALLE if con_calle else ACERCAMIENTO_COMUNA,
        "language": "es",
        "region": "CL",
    }
    return f"{URL_MAPA}?{urlencode(parametros)}"


def _tiene_punto_exacto(ubicacion: PropiedadUbicacion | None) -> bool:
    return (
        ubicacion is not None
        and ubicacion.accuracy == "direccion"
        and ubicacion.latitude is not None
        and ubicacion.longitude is not None
    )


def lugar_para_foto(
    ubicacion: PropiedadUbicacion | None, direccion: str | None, nombre_comuna: str | None
) -> str | None:
    """Paso 135d: dónde buscar la foto de calle. Con calle y número guardados, las coordenadas; si no, la dirección
    escrita (Google la ubica por su cuenta). Sin calle reconocible no se busca: la foto sería de cualquier lugar."""
    if _tiene_punto_exacto(ubicacion):
        return f"{ubicacion.latitude:.6f},{ubicacion.longitude:.6f}"
    texto, con_calle = texto_para_google(direccion, nombre_comuna)
    return texto if con_calle else None


def url_imagen_fija(
    ubicacion: PropiedadUbicacion | None, direccion: str | None, nombre_comuna: str | None, clave: str
) -> str | None:
    """Paso 135d: imagen fija para la tarjeta del catálogo. Sin "heading", Google apunta la cámara a la dirección
    desde el punto donde se tomó la foto más cercana (el portón, la entrada del edificio o del terreno).
    return_error_code hace que, si no hay foto, la imagen falle y la tarjeta muestre la foto o el dibujo de siempre."""
    lugar = lugar_para_foto(ubicacion, direccion, nombre_comuna)
    if not clave or not lugar:
        return None
    parametros = {
        "size": TAMANO_IMAGEN_FIJA,
        "location": lugar,
        "fov": CAMPO_DE_VISION,
        "source": "outdoor",
        "return_error_code": "true",
        "key": clave,
    }
    if _tiene_punto_exacto(ubicacion):
        parametros["radius"] = RADIO_FOTO_METROS
    return f"{URL_IMAGEN_FIJA}?{urlencode(parametros)}"


def rumbo(desde_lat: float, desde_lng: float, hacia_lat: float, hacia_lng: float) -> float:
    """Hacia dónde mirar (grados desde el norte, de 0 a 360) para ver el segundo punto desde el primero."""
    f1, f2 = math.radians(desde_lat), math.radians(hacia_lat)
    dl = math.radians(hacia_lng - desde_lng)
    x = math.sin(dl) * math.cos(f2)
    y = math.cos(f1) * math.sin(f2) - math.sin(f1) * math.cos(f2) * math.cos(dl)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


_memoria: dict[str, tuple[float, dict | None]] = {}


def buscar_foto(lugar: str, clave_servidor: str) -> dict | None:
    """Paso 135d: la foto de calle más cercana a ese lugar (búsqueda gratis de Google, sin cuota).
    Devuelve {"pano": código, "lat": ..., "lng": ...} o None si no hay foto o Google no responde."""
    if not clave_servidor or not lugar:
        return None
    guardado = _memoria.get(lugar)
    if guardado and guardado[0] > time.time():
        return guardado[1]
    parametros = {"location": lugar, "source": "outdoor", "key": clave_servidor}
    if lugar[:1] in "-0123456789":  # son coordenadas
        parametros["radius"] = RADIO_FOTO_METROS
    try:
        datos = requests.get(URL_BUSCAR_FOTO, params=parametros, timeout=4).json()
    except (requests.RequestException, ValueError):
        return None  # sin respuesta de Google: no se guarda, se reintenta la próxima vez
    foto = None
    if datos.get("status") == "OK" and datos.get("pano_id") and datos.get("location"):
        foto = {"pano": datos["pano_id"], "lat": datos["location"]["lat"], "lng": datos["location"]["lng"]}
    if datos.get("status") in ("OK", "ZERO_RESULTS", "NOT_FOUND"):
        if len(_memoria) > 3000:
            _memoria.clear()
        _memoria[lugar] = (time.time() + SEGUNDOS_EN_MEMORIA, foto)
    return foto


def vista_de(
    ubicacion: PropiedadUbicacion | None,
    clave: str,
    direccion: str | None = None,
    nombre_comuna: str | None = None,
    clave_servidor: str = "",
    buscar=buscar_foto,
) -> VistaCalleOut:
    """Arma la respuesta de la ficha. Se separa del endpoint para probarla sin base de datos ni Google
    (tests/test_vista_calle.py le pasa su propio "buscar")."""
    if not clave:
        return VistaCalleOut(disponible=False, motivo="sin_clave")

    # Paso 135d: la foto de calle más cercana, para TODOS los remates que tengan al menos la calle
    foto = buscar(lugar_para_foto(ubicacion, direccion, nombre_comuna), clave_servidor) if clave_servidor else None
    if foto:
        # Con el punto exacto, la cámara mira hacia la propiedad; con la dirección escrita, se ve la calle frente a
        # ella y se puede girar
        mirar = (
            rumbo(foto["lat"], foto["lng"], ubicacion.latitude, ubicacion.longitude)
            if _tiene_punto_exacto(ubicacion)
            else None
        )
        return VistaCalleOut(disponible=True, tipo="calle", url=url_vista_panorama(foto["pano"], clave, mirar))

    # Sin la búsqueda (sin clave del servidor o sin foto cerca): como en el paso 135c
    if _tiene_punto_exacto(ubicacion):
        return VistaCalleOut(
            disponible=True, tipo="calle", url=url_vista_calle(ubicacion.latitude, ubicacion.longitude, clave)
        )
    texto, con_calle = texto_para_google(direccion, nombre_comuna)
    return VistaCalleOut(disponible=True, tipo="mapa", url=url_mapa(texto, con_calle, clave))


@router.get("/{property_id}/vista-calle", response_model=VistaCalleOut)
def vista_calle(property_id: UUID, db: Session = Depends(get_db), usuario=Depends(requerir_premium)):
    # Es parte del detalle: la ve quien tiene Premium (o es analista o admin), igual que el precio y las fotos
    propiedad = db.query(Property).filter(Property.id == property_id).first()
    if not propiedad:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    nombre_comuna = propiedad.comuna.name if propiedad.comuna else None
    return vista_de(
        db.get(PropiedadUbicacion, property_id),
        clave_de_google(),
        propiedad.address,
        nombre_comuna,
        clave_del_servidor(),
    )
