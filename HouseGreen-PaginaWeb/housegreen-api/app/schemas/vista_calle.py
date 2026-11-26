from pydantic import BaseModel


class VistaCalleOut(BaseModel):
    # Pasos 135 y 135c: lo que se muestra con Google como foto principal de un remate.
    # disponible = True  -> url es la dirección del visor de Google (va dentro de un <iframe>) y tipo dice cuál es:
    #                       "calle" = vista de calle (Street View) en la dirección exacta;
    #                       "mapa"  = mapa de Google con la dirección publicada (cuando no tenemos el número).
    # disponible = False -> motivo "sin_clave": el equipo todavía no configuró GOOGLE_MAPS_EMBED_KEY
    #                       (la web y la app muestran la foto de siempre).
    disponible: bool
    tipo: str | None = None
    url: str | None = None
    motivo: str | None = None
