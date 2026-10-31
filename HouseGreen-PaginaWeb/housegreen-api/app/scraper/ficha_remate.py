# Paso 59: lee la ficha de un remate (la página con el detalle) y entrega sus datos ordenados.
# Paso 118b: el sitio cambió su diseño (octubre de 2026). Antes los datos venían en una tabla
# (<tr><td>Etiqueta:</td><td>valor</td></tr>); ahora vienen en listas de definición (<dt>Etiqueta</dt><dd>valor</dd>).
# Se leen los dos formatos, así sirve con cualquiera de los dos.
# Para probarlo:  python -m app.scraper.ficha_remate
import re
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

from app.scraper.comuna_matcher import normalizar
from app.scraper.remates_scraper import BASE_URL, limpiar_precio, obtener_html

ZONA_CHILE = ZoneInfo("America/Santiago")

# Cómo se llama cada dato en la ficha del sitio (sin tildes ni mayúsculas) y con qué nombre lo guardamos.
# Hay nombres del diseño antiguo y del nuevo ("rol" / "rol de la causa", "fecha" / "fecha del remate"...).
ETIQUETAS = {
    "origen": "origen",
    "tribunal / juez": "tribunal",
    "rol": "rol_causa",
    "rol de la causa": "rol_causa",
    "tipo remate": "modalidad",
    "modalidad": "modalidad",
    "fecha": "fecha",
    "fecha del remate": "fecha",
    "lugar": "lugar",
    "tipo propiedad": "tipo_propiedad",
    "postura minima": "postura_minima",
    "direccion": "direccion",
    "garantia": "garantia",
    "forma de pago": "forma_pago",
    "plazo": "plazo",
    "requisitos": "requisitos",
    "condiciones": "condiciones",
    "anuncio": "anuncio",
    "observaciones": "observaciones",
}

# Palabras que indican que NO se remata la propiedad completa
PALABRAS_OTRO_DOMINIO = ["derecho", "cuota", "nuda propiedad", "usufructo"]


class FichaIlegible(Exception):
    """La página de la ficha respondió, pero no trae datos que se puedan leer
    (por ejemplo, porque el sitio volvió a cambiar su diseño). NO significa que el remate se haya retirado."""


def limpiar_texto(texto: str) -> str | None:
    # Junta los espacios y saltos de línea repetidos; si queda vacío, devuelve None
    texto = " ".join(texto.split())
    return texto or None


def convertir_fecha_hora(texto: str | None) -> datetime | None:
    # Acepta "2026-10-07 Hora: 11:30:00" (diseño antiguo) y "02-11-2026 11:30" (diseño nuevo).
    # Si la ficha no trae hora, queda a las 00:00 (que en HouseGreen significa "hora no informada").
    texto = texto or ""
    encontrado = re.search(r"(\d{4})-(\d{2})-(\d{2})(?:\D+(\d{1,2}):(\d{2}))?", texto)
    if encontrado:
        anio, mes, dia, hora, minuto = encontrado.groups()
    else:
        encontrado = re.search(r"(\d{2})-(\d{2})-(\d{4})(?:\D+(\d{1,2}):(\d{2}))?", texto)
        if not encontrado:
            return None
        dia, mes, anio, hora, minuto = encontrado.groups()
    try:
        return datetime(int(anio), int(mes), int(dia), int(hora or 0), int(minuto or 0), tzinfo=ZONA_CHILE)
    except ValueError:
        return None


def monto_de_garantia(texto: str | None) -> float | None:
    # "29.538.183 CLP, Garantía por el 10% del mínimo..." -> 29538183.0
    # Si la garantía está en UF ("750 UF, vale vista..."), no se guarda el monto (solo el texto).
    encontrado = re.match(r"\s*\$?\s*([\d.]+)\s*CLP", texto or "")
    return limpiar_precio(encontrado.group(1)) if encontrado else None


def dominio_de_la_ficha(titulo: str | None, tipo_propiedad: str | None) -> str | None:
    # Reglas del semáforo v2: "exclusivo" si se remata la propiedad completa, "otro" si se rematan
    # derechos, una cuota, la nuda propiedad o un usufructo, y None si no hay cómo saberlo.
    # Se mira el título y el tipo de propiedad, que dicen QUÉ se remata. El anuncio no se usa porque
    # casi siempre nombra "derechos" por otros motivos (bienes comunes, servidumbres) y daría falsos avisos.
    texto = normalizar(f"{titulo or ''} {tipo_propiedad or ''}")
    if not texto:
        return None
    if any(palabra in texto for palabra in PALABRAS_OTRO_DOMINIO) or re.search(r"\d\s*%", texto):
        return "otro"
    return "exclusivo"


def _guardar(datos: dict, etiqueta: str, valor: str) -> None:
    # Si la etiqueta es una de las conocidas y todavía no tiene valor, se guarda
    nombre = ETIQUETAS.get(normalizar(etiqueta).rstrip(":").strip())
    texto = limpiar_texto(valor)
    if nombre and texto and nombre not in datos:
        datos[nombre] = texto


def extraer_ficha(html: str) -> dict | None:
    # Recibe el HTML de la ficha y devuelve un diccionario con sus datos (None si la página no trae datos)
    soup = BeautifulSoup(html, "lxml")
    datos = {}

    # Diseño nuevo: <dt>Etiqueta</dt><dd>valor</dd>
    for termino in soup.find_all("dt"):
        definicion = termino.find_next_sibling("dd")
        if definicion:
            _guardar(datos, termino.get_text(), definicion.get_text(" "))

    # Diseño nuevo: el precio y la fecha van en un recuadro aparte, y el anuncio en su propia sección
    for clase in ("rf-precio", "rf-fecha"):
        recuadro = soup.find(class_=clase)
        if recuadro and recuadro.find("span") and recuadro.find("strong"):
            _guardar(datos, recuadro.find("span").get_text(), recuadro.find("strong").get_text())
    anuncio = soup.select_one(".rf-anuncio .rf-texto")
    if anuncio:
        _guardar(datos, "anuncio", anuncio.get_text(" "))

    # Diseño antiguo: cada dato en una fila de tabla (primera celda el nombre, segunda el valor)
    for fila in soup.find_all("tr"):
        celdas = fila.find_all(["td", "th"])
        if len(celdas) >= 2:
            _guardar(datos, celdas[0].get_text(), celdas[1].get_text(" "))

    # Sin tribunal, fecha ni anuncio no es una ficha (puede ser la página de "no encontrado")
    if not any(datos.get(clave) for clave in ("tribunal", "fecha", "anuncio", "origen")):
        return None

    # El título es el primer encabezado que describe la propiedad (en el diseño antiguo había otro que decía "Ficha del Remate")
    titulo = None
    for encabezado in soup.find_all(["h1", "h2", "h3"]):
        texto = limpiar_texto(encabezado.get_text())
        if texto and normalizar(texto) != "ficha del remate":
            titulo = texto
            break

    postura = datos.get("postura_minima")
    return {
        "titulo": titulo,
        "origen": datos.get("origen"),
        "tribunal": datos.get("tribunal"),
        "rol_causa": datos.get("rol_causa"),
        "modalidad": datos.get("modalidad"),
        "fecha_hora": convertir_fecha_hora(datos.get("fecha")),
        "lugar": datos.get("lugar"),
        "tipo_propiedad": datos.get("tipo_propiedad"),
        # Si la postura está en UF no se convierte aquí: el precio en pesos lo trae el listado
        "postura_minima": None if "uf" in normalizar(postura or "") else limpiar_precio(postura or ""),
        "direccion": datos.get("direccion"),
        "garantia": datos.get("garantia"),
        "garantia_monto": monto_de_garantia(datos.get("garantia")),
        "forma_pago": datos.get("forma_pago"),
        "plazo": datos.get("plazo"),
        "requisitos": datos.get("requisitos"),
        "condiciones": datos.get("condiciones"),
        "anuncio": datos.get("anuncio"),
        "observaciones": datos.get("observaciones"),
        "dominio": dominio_de_la_ficha(titulo, datos.get("tipo_propiedad")),
    }


def leer_ficha(remate_id: str) -> dict | None:
    """Abre la ficha de un remate en el sitio.
    - Devuelve sus datos si se pudo leer.
    - Devuelve None si el sitio dice que el remate no existe (página 404 o "Remate no encontrado").
    - Lanza FichaIlegible si la página respondió pero no se entiende (no se debe tomar como retirado)."""
    try:
        html = obtener_html(f"{BASE_URL}/ficha-remate.php?id={remate_id}")
    except requests.HTTPError as error:
        if error.response is not None and error.response.status_code in (404, 410):
            return None
        raise
    ficha = extraer_ficha(html)
    if ficha:
        ficha["remate_id"] = remate_id
        return ficha
    if "no encontrado" in normalizar(BeautifulSoup(html, "lxml").get_text(" ")):
        return None
    raise FichaIlegible(f"La ficha {remate_id} no trae datos que se puedan leer")


if __name__ == "__main__":
    # Prueba: lee dos fichas y muestra lo que entendió de cada una
    for remate_id in ["61110", "58465"]:
        print("=" * 70)
        try:
            ficha = leer_ficha(remate_id)
        except FichaIlegible as error:
            print(error)
            continue
        if not ficha:
            print("Ficha", remate_id, ": el sitio dice que no existe")
            continue
        for nombre, valor in ficha.items():
            if isinstance(valor, str) and len(valor) > 90:
                valor = valor[:90] + "…"
            print(f"{nombre:15} {valor}")