# Paso 120a: precio típico de las propiedades en venta en cada comuna de la Región Metropolitana.
# Fuente: PropiedadesYa (https://propiedadesya.com/mercado/<comuna>), que publica para cada comuna una tabla
# con la mediana de precio de venta por tipo (departamentos, casas, oficinas...) y cuántos avisos usó.
# Su robots.txt permite leer /mercado/ (revisado el 30-10-2026).
#
#   python -m app.scraper.precios_comuna   -> actualiza los precios ahora (una petición por comuna, ~2 minutos)
#
# La carga diaria (ingesta.py) lo llama sola, pero solo actualiza si pasaron 7 días desde la última vez.
import re
import sys
from datetime import date, datetime, timedelta, timezone

import requests
from bs4 import BeautifulSoup
from sqlalchemy import func

from app.database import SessionLocal
from app.models.precio_comuna import ComunaMarketPrice
from app.models.property import Comuna, Region
from app.scraper.comuna_matcher import nombre_para_direccion, normalizar
from app.scraper.remates_scraper import obtener_html

BASE_PY = "https://propiedadesya.com"
URL_INDICE = f"{BASE_PY}/mercado"
DIAS_ENTRE_ACTUALIZACIONES = 7
ERRORES_SEGUIDOS_PARA_PARAR = 5

MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7,
    "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}

# Nombre del tipo en la tabla de la fuente (sin tildes, en minúscula) -> nombre corto que guardamos
TIPOS = {
    "departamentos": "departamento",
    "casas": "casa",
    "oficinas": "oficina",
    "locales comerciales": "local comercial",
    "terrenos": "terreno",
    "bodegas": "bodega",
    "estacionamientos": "estacionamiento",
    "parcelas": "parcela",
}


def numero(texto: str | None) -> float | None:
    # "2.303" -> 2303 · "51,4" -> 51.4 · "1.234,5" -> 1234.5 (punto de miles y coma decimal, como en Chile)
    encontrado = re.search(r"\d[\d.]*(?:,\d+)?", texto or "")
    if not encontrado:
        return None
    return float(encontrado.group(0).replace(".", "").replace(",", "."))


def fecha_de_la_pagina(soup: BeautifulSoup) -> date | None:
    # "Actualizado el 1 de noviembre de 2026"
    encontrado = re.search(r"actualizado el (\d{1,2}) de ([a-z]+) de (\d{4})", normalizar(soup.get_text(" ")))
    if not encontrado or encontrado.group(2) not in MESES:
        return None
    dia, mes, anio = encontrado.groups()
    try:
        return date(int(anio), MESES[mes], int(dia))
    except ValueError:
        return None


def extraer_precios(html: str) -> tuple[list[dict], date | None]:
    """Lee la tabla "Venta en <comuna>" (Tipo · Precio mediano · UF/m² · Superficie · Muestra).
    Devuelve una fila por tipo y la fecha de actualización. Si la comuna tiene pocos avisos,
    la página no trae esa tabla y la lista sale vacía."""
    soup = BeautifulSoup(html, "lxml")
    filas = []
    for tabla in soup.find_all("table"):
        encabezados = [normalizar(th.get_text(" ", strip=True)) for th in tabla.find_all("th")]
        if not any("precio mediano" in encabezado for encabezado in encabezados):
            continue  # es la tabla de arriendos u otra
        for fila in tabla.find_all("tr"):
            celdas = [celda.get_text(" ", strip=True) for celda in fila.find_all("td")]
            if len(celdas) < 5:
                continue
            uf = re.search(r"UF\s*([\d.,]+)", celdas[1])
            pesos = re.search(r"\$\s*([\d.]+)", celdas[1])
            muestra = numero(celdas[4])
            if not uf or not pesos or muestra is None:
                continue
            rango = [numero(parte) for parte in re.split(r"[–-]", celdas[2]) if numero(parte) is not None]
            filas.append(
                {
                    "label": celdas[0][:60],
                    "kind": TIPOS.get(normalizar(celdas[0]), normalizar(celdas[0]))[:40],
                    "median_uf": numero(uf.group(1)),
                    "median_clp": numero(pesos.group(1)),
                    "uf_m2_p25": rango[0] if len(rango) == 3 else None,
                    "uf_m2_median": rango[1] if len(rango) == 3 else None,
                    "uf_m2_p75": rango[2] if len(rango) == 3 else None,
                    "median_surface_m2": numero(celdas[3]),
                    "sample_size": int(muestra),
                }
            )
        break  # solo la primera tabla de venta
    return filas, fecha_de_la_pagina(soup)


def slugs_del_indice() -> set[str] | None:
    # Las direcciones de todas las comunas que tienen página ("/mercado/las-condes" -> "las-condes")
    soup = BeautifulSoup(obtener_html(URL_INDICE), "lxml")
    slugs = {
        a["href"].split("/")[2]
        for a in soup.find_all("a", href=True)
        if a["href"].startswith("/mercado/") and a["href"].count("/") == 2
    }
    return slugs or None


def slug_de(nombre: str, slugs: set[str] | None) -> str | None:
    # "Estación Central" -> "estacion-central". Si la fuente lo escribe distinto ("Tiltil" / "til-til"),
    # se compara sin guiones. Devuelve None si la comuna no tiene página en la fuente (por ejemplo, Alhué).
    base = nombre_para_direccion(nombre)
    if slugs is None or base in slugs:
        return base
    compacto = base.replace("-", "")
    return next((slug for slug in slugs if slug.replace("-", "") == compacto), None)


def toca_actualizar(db) -> bool:
    ultima = db.query(func.max(ComunaMarketPrice.fetched_at)).scalar()
    return ultima is None or ultima < datetime.now(timezone.utc) - timedelta(days=DIAS_ENTRE_ACTUALIZACIONES)


def actualizar_precios(forzar: bool = False) -> dict:
    resumen = {
        "omitida": None,  # motivo, si esta vez no tocaba actualizar
        "comunas_leidas": 0,
        "con_precios": 0,
        "filas": 0,
        "sin_tabla": [],  # comunas con pocos avisos: la fuente no publica precios por tipo
        "sin_pagina": [],  # comunas que la fuente no tiene
        "con_error": [],
    }
    db = SessionLocal()
    try:
        if not forzar and not toca_actualizar(db):
            resumen["omitida"] = f"Los precios se actualizaron hace menos de {DIAS_ENTRE_ACTUALIZACIONES} días."
            return resumen

        comunas = (
            db.query(Comuna)
            .join(Region, Comuna.region_id == Region.id)
            .filter(Region.name.ilike("%metropolitana%"))
            .order_by(Comuna.name)
            .all()
        )
        try:
            slugs = slugs_del_indice()
        except requests.RequestException as error:
            slugs = None  # sin el índice se prueba directo con el nombre de cada comuna
            resumen["con_error"].append(f"Índice de comunas: {type(error).__name__}")

        errores_seguidos = 0
        for comuna in comunas:
            nombre, comuna_id = comuna.name, comuna.id
            slug = slug_de(nombre, slugs)
            if not slug:
                resumen["sin_pagina"].append(nombre)
                continue
            url = f"{BASE_PY}/mercado/{slug}"
            try:
                filas, fecha = extraer_precios(obtener_html(url))
            except requests.RequestException as error:
                resumen["con_error"].append(f"{nombre}: {type(error).__name__}")
                errores_seguidos += 1
                if errores_seguidos >= ERRORES_SEGUIDOS_PARA_PARAR:
                    resumen["con_error"].append("Se dejó de leer: la fuente no está respondiendo.")
                    break
                continue
            errores_seguidos = 0
            resumen["comunas_leidas"] += 1

            # Se reemplazan los precios de la comuna por los de hoy. Si ya no tiene tabla (pocos avisos),
            # se borran los antiguos: no hay un precio típico confiable.
            db.query(ComunaMarketPrice).filter(ComunaMarketPrice.comuna_id == comuna_id).delete()
            for fila in filas:
                db.add(ComunaMarketPrice(comuna_id=comuna_id, source_url=url, source_date=fecha, **fila))
            db.commit()
            if filas:
                resumen["con_precios"] += 1
                resumen["filas"] += len(filas)
            else:
                resumen["sin_tabla"].append(nombre)
    finally:
        db.close()
    return resumen


def mostrar_resumen(resumen: dict) -> None:
    if resumen["omitida"]:
        print("Precios por comuna:", resumen["omitida"])
        return
    print(f"Comunas leídas: {resumen['comunas_leidas']} | con precios: {resumen['con_precios']} | filas guardadas: {resumen['filas']}")
    print("Sin precios por tipo (pocos avisos):", len(resumen["sin_tabla"]), resumen["sin_tabla"])
    print("Sin página en la fuente:", len(resumen["sin_pagina"]), resumen["sin_pagina"])
    print("Con error:", len(resumen["con_error"]), resumen["con_error"])


if __name__ == "__main__":
    print("Leyendo los precios de PropiedadesYa (una página por comuna, unos 2 minutos)...")
    mostrar_resumen(actualizar_precios(forzar="--si-toca" not in sys.argv))