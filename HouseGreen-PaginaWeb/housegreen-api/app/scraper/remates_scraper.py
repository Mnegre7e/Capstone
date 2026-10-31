import json
import re
import time
from datetime import date, datetime

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.rematesinmobiliarios.cl"
# Página pública de los remates de la Región Metropolitana
URL_RM = f"{BASE_URL}/remates/region-metropolitana/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
PAUSA_ENTRE_PETICIONES = 1.5

# Paso 118b: el sitio cambió su diseño (octubre de 2026). Ahora cada página del catálogo trae TODOS los
# remates vigentes de Chile como datos (JSON) dentro de <script id="ri-datos">, y la tabla visible
# muestra solo los primeros 20. Por eso basta con pedir UNA página y leer esos datos
# (ya no hace falta recorrer comuna por comuna).
ID_DE_LOS_DATOS = "ri-datos"


def obtener_html(url: str) -> str:
    respuesta = requests.get(url, headers=HEADERS, timeout=15)
    # La pausa va siempre (también si la página no existe), para no recargar al sitio
    time.sleep(PAUSA_ENTRE_PETICIONES)
    respuesta.raise_for_status()
    return respuesta.text


def limpiar_precio(texto: str) -> float | None:
    # Convierte "$62.125.239" en 62125239.0
    if not texto or not texto.strip():
        return None
    numeros = re.sub(r"[^\d]", "", texto)
    return float(numeros) if numeros else None


def convertir_fecha(texto: str | None) -> date | None:
    # Acepta "2026-11-02" (como vienen los datos nuevos) y "02-11-2026" (como venía el listado antiguo).
    # Si viene vacía o con otro formato, devuelve None en vez de fallar.
    texto = (texto or "").strip()
    for formato in ("%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(texto, formato).date()
        except ValueError:
            continue
    return None


def tipo_de_remate_del_sitio(registro: dict) -> str:
    # El sitio marca con "judicial" 0 los remates de tribunales, 1 los extrajudiciales (martilleros como Macal)
    # y 2 los de Tattersall (también extrajudiciales). Los de la Tesorería (TGR) son remates por contribuciones.
    origen = (registro.get("origen") or "").lower()
    if registro.get("judicial") in (1, 2):
        return "extrajudicial"
    if "tesorer" in origen or "tgr" in origen:
        return "contribuciones"
    return "judicial"


def remate_desde_registro(registro: dict) -> dict | None:
    # Convierte un remate de los datos del sitio en el diccionario que usa el cargador
    if not registro.get("id"):
        return None
    superficie = registro.get("superficie")
    return {
        "remate_id": str(registro["id"]),
        "tipo_remate": tipo_de_remate_del_sitio(registro),
        "fecha_remate": convertir_fecha(registro.get("fecha_remate")),
        "fecha_publicado": convertir_fecha(registro.get("fecha_publicacion")),
        "region": registro.get("region") or "",
        "comuna": registro.get("comuna") or "",
        "tipo_propiedad": registro.get("tipo_propiedad"),
        "direccion": registro.get("direccion_inmueble"),
        "m2": float(superficie) if superficie else None,
        "precio_minimo": float(registro["valor_clp"]) if registro.get("valor_clp") else None,
        "url_ficha": f"{BASE_URL}/ficha-remate.php?id={registro['id']}",
    }


def extraer_remates(html: str) -> list[dict]:
    # Lee los datos escondidos en la página. Si no están (el sitio volvió a cambiar), devuelve una lista vacía.
    soup = BeautifulSoup(html, "lxml")
    script = soup.find("script", id=ID_DE_LOS_DATOS)
    if not script or not script.string:
        return []
    try:
        registros = json.loads(script.string)
    except json.JSONDecodeError:
        return []
    if not isinstance(registros, list):
        return []
    remates = [remate_desde_registro(registro) for registro in registros if isinstance(registro, dict)]
    return [remate for remate in remates if remate]


def leer_remates() -> list[dict]:
    # Todos los remates vigentes que publica el sitio (de todas las regiones), con una sola petición
    return extraer_remates(obtener_html(URL_RM))


if __name__ == "__main__":
    remates = leer_remates()
    de_la_rm = [r for r in remates if r["region"].lower().startswith("metropolitana")]
    print(f"El sitio publica {len(remates)} remates vigentes; {len(de_la_rm)} son de la Región Metropolitana.\n")
    for r in de_la_rm[:5]:
        print(r["remate_id"], "|", r["fecha_remate"], "|", r["comuna"], "|", r["tipo_propiedad"], "|", r["tipo_remate"], "|", r["precio_minimo"])