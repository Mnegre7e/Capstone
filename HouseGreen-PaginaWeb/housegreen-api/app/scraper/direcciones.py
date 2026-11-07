# Paso 124a: saca la calle y el número de las direcciones del sitio de remates, para ubicarlas en el mapa.
#
# Las direcciones vienen escritas como en el aviso del tribunal, por ejemplo:
#   "Departamento nº 1103-E, Torre E, 11º piso, Condominio Ciudad del Niño, San Petersburgo nº 6351, San Miguel"
#   "Pasaje San Vicente de Paul número mil setecientos veintiocho, comuna de San Bernardo"
#   "Casa H, Condominio Montevista, acceso por Nicanor Plaza 2475, La Reina"
# De ahí se saca solo la calle y el número ("San Petersburgo", "6351"), que es lo que entiende el buscador
# de direcciones de OpenStreetMap. El departamento, la torre, el lote o el condominio no sirven para ubicarla.
import re
import unicodedata

# Partes de la dirección que NO son la calle (se saltan). Se comparan sin tildes y en minúsculas.
PARTES_QUE_NO_SON_CALLE = re.compile(
    r"^(?:(?:la|el|los|las|del|de la|de los|y|y el|y la)\s+)?"
    r"(?:departamentos?|deptos?\.?|dptos?\.?|dep\.|casa\s+\S{1,4}$|casa\s+n|lotes?|sitios?|manzanas?|bodegas?|"
    r"estacionamientos?|pisos?|torres?|block|edificios?|condominios?|conjuntos?|etapas?|local(?:es)?|loc\.|oficinas?|"
    r"parcelas?|hijuelas?|loteos?|macrolotes?|viviendas?|parte\s+de|poblacion|villa|sector|plano|comuna|region|"
    r"provincia|localidad|escala|unidad|"
    r"inmuebles?|propiedad|derechos?|cuota|acciones|uso y goce|el uso|primer|segund|tercer|cuart|quint|"
    r"metropolitana|rol|fojas|inscrit|subterraneo|nivel|subdivision|division|fusion|resto|predio|fundo|chacra|"
    r"reserva|proyecto|paño|triangulo)\b"
)

# "Av." -> "Avenida"; "calle" se quita (en OpenStreetMap las calles casi nunca llevan esa palabra)
TIPOS_DE_CALLE = r"(?:avenida|av\.?|avda\.?|pasaje|psje\.?|pje\.?|camino|calle|diagonal|circunvalaci[oó]n)"

# Las formas de escribir "número": "número", "Nº", "N°", "N.º", "Nro. 12", "No 12", "N 280", "#".
# "No", "Nro" y la N sola valen solo si viene un número después (para no confundirlas con "Norte" o "Concón").
MARCA_DE_NUMERO = r"(?:n[uú]mero|n\.?\s?[º°ª˚]\.?|\bn(?:ro|o)?\.?(?=\s?\d)|#)"

# Números escritos con palabras, como en los avisos judiciales ("número mil setecientos veintiocho")
NUMEROS_EN_PALABRAS = {
    "cero": 0, "un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7,
    "ocho": 8, "nueve": 9, "diez": 10, "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15,
    "dieciseis": 16, "diecisiete": 17, "dieciocho": 18, "diecinueve": 19, "veinte": 20, "veintiun": 21,
    "veintiuno": 21, "veintidos": 22, "veintitres": 23, "veinticuatro": 24, "veinticinco": 25, "veintiseis": 26,
    "veintisiete": 27, "veintiocho": 28, "veintinueve": 29, "treinta": 30, "cuarenta": 40, "cincuenta": 50,
    "sesenta": 60, "setenta": 70, "ochenta": 80, "noventa": 90, "cien": 100, "ciento": 100, "doscientos": 200,
    "trescientos": 300, "cuatrocientos": 400, "quinientos": 500, "seiscientos": 600, "setecientos": 700,
    "ochocientos": 800, "novecientos": 900,
}


def sin_tildes(texto: str) -> str:
    """ "Peñalolén" -> "penalolen" (para comparar sin fijarse en tildes ni mayúsculas)"""
    sin = unicodedata.normalize("NFD", texto)
    return "".join(letra for letra in sin if unicodedata.category(letra) != "Mn").lower()


def numero_en_palabras(palabras: list[str]) -> int | None:
    """["mil", "setecientos", "veintiocho"] -> 1728. Devuelve None si no hay ningún número."""
    total, actual, alguno = 0, 0, False
    for palabra in palabras:
        palabra = sin_tildes(palabra)
        if palabra == "y":
            continue
        if palabra == "mil":
            total += (actual or 1) * 1000
            actual, alguno = 0, True
        elif palabra in NUMEROS_EN_PALABRAS:
            actual += NUMEROS_EN_PALABRAS[palabra]
            alguno = True
        else:
            break  # se terminó el número
    return total + actual if alguno else None


def _nombre_de_la_calle(tipo: str | None, nombre: str) -> str:
    nombre = re.sub(r"\s+", " ", nombre).strip(" .-")
    tipo = sin_tildes(tipo or "").strip(" .")
    if tipo in ("av", "avda", "avenida"):
        return f"Avenida {nombre}"
    if tipo in ("pasaje", "psje", "pje"):
        return f"Pasaje {nombre}"
    if tipo == "camino":
        return f"Camino {nombre}"
    if tipo.startswith("diagonal") or tipo.startswith("circunvalacion"):
        return f"{tipo.capitalize()} {nombre}"
    return nombre  # "calle X" queda como "X"


CON_NUMERO = re.compile(
    rf"^(?:{TIPOS_DE_CALLE}\s+)?(?P<nombre>[^\d,]*?[A-Za-zÁÉÍÓÚÑáéíóúñ'][^\d,]*?)\s*"
    rf"{MARCA_DE_NUMERO}?\s*(?P<numero>\d[\d.]*)",
    re.IGNORECASE,
)
# Una calle en medio del texto: "…del block de pasaje Ailla 6.390…", "…edificio de calle Monjitas 298…"
CALLE_EN_MEDIO = re.compile(
    rf"\b(?P<tipo>{TIPOS_DE_CALLE})\s+(?P<nombre>[A-Za-zÁÉÍÓÚÑáéíóúñ'][^\d,;]*?)\s*"
    rf"{MARCA_DE_NUMERO}?\s*(?P<numero>\d[\d.]*)",
    re.IGNORECASE,
)
EDIFICIO_CON_NUMERO = re.compile(
    rf"\b(?:edificio|condominio)\s+(?P<nombre>[A-Za-zÁÉÍÓÚÑáéíóúñ'][^\d,;]*?)\s*{MARCA_DE_NUMERO}?\s*(?P<numero>\d[\d.]{{1,6}})\b",
    re.IGNORECASE,
)
# Lo que viene después de estas frases es la dirección ("…con acceso principal por calle Concón 0165…").
# Si aparecen varias, vale la última.
ANTES_DE_LA_DIRECCION = re.compile(
    r"(?:(?:acceso|ingreso)\s+(?:[a-záéíóú]+\s+){0,2}?(?:por|en)|ubicad[oa]s?\s+en|inmueble\s+en|edificio\s+(?:de\s+)?en|"
    r"edificio\s+de)\s+(?:el\s+|la\s+)?(?P<resto>.+)",
    re.IGNORECASE,
)
CON_TIPO = re.compile(rf"^(?P<tipo>{TIPOS_DE_CALLE})\s+", re.IGNORECASE)
CON_NUMERO_EN_PALABRAS = re.compile(rf"^(?P<nombre>.+?)\s+{MARCA_DE_NUMERO}\s*(?P<palabras>[A-Za-zÁÉÍÓÚáéíóú ]+)$", re.IGNORECASE)


# Paso 124f: "Números 1902 al 1912 de la calle Santa Rosa" (el número va antes de la calle)
NUMEROS_DE_LA_CALLE = re.compile(
    rf"\bn[uú]meros?\s+(?P<numero>\d[\d.]*)(?:\s*(?:al|a|y|-)\s*\d[\d.]*)?\s+de\s+(?:la\s+)?"
    rf"(?P<tipo>{TIPOS_DE_CALLE})\s+(?P<nombre>[A-Za-zÁÉÍÓÚÑáéíóúñ'][^\d,;]*?)(?=\s+esquina\b|\s*[,;]|\s*$)",
    re.IGNORECASE,
)
# Paso 124f: palabras que van antes del nombre pero no son parte de él ("Calle Interior Canal Baker 47",
# "Caletera Américo Vespucio 1700"). Si después no queda nombre ("calle interior nº 982"), no es una calle.
PREFIJOS_DEL_NOMBRE = re.compile(r"^(?:interior|caletera)\b\s*", re.IGNORECASE)


def _sin_prefijos(nombre: str) -> str:
    return PREFIJOS_DEL_NOMBRE.sub("", nombre.strip())


def calle_y_numero(direccion: str | None) -> tuple[str, str | None] | None:
    """Devuelve (calle, número) o (calle, None) si no trae número. None si no se encuentra la calle."""
    texto = (direccion or "").strip()
    if not texto:
        return None
    # "Avenida Calera de Tango s/n", "Calle Los Diecisiete sin número": no tienen número
    texto = re.sub(r"\s+(?:s/n|s/nº|sin\s+n[uú]mero)\b", "", texto, flags=re.IGNORECASE)
    if re.match(r"^(?:calle|pasaje)\s+sin\s+nombre\b", texto, re.IGNORECASE):
        texto = re.sub(r"^(?:calle|pasaje)\s+sin\s+nombre\s*(?:y\s*)?,?", "", texto, flags=re.IGNORECASE)
    # Paso 124f: "Números 1902 al 1912 de la calle Santa Rosa esquina de Concepción"
    numeros_de = NUMEROS_DE_LA_CALLE.search(texto)
    if numeros_de:
        return _nombre_de_la_calle(numeros_de.group("tipo"), numeros_de.group("nombre")), numeros_de.group("numero").replace(".", "")
    # "…, con acceso (principal) por calle Concón 0165, …": la dirección es lo que viene después
    while (antes := ANTES_DE_LA_DIRECCION.search(texto)) is not None:
        texto = antes.group("resto")

    for parte in re.split(r",|;|\s+y\s+acceso", texto):
        parte = re.sub(r"^\s*(?:ubicad[oa]s?\s+en|en)\s+", "", parte.strip(), flags=re.IGNORECASE).strip()
        while (antes := ANTES_DE_LA_DIRECCION.search(parte)) is not None:
            parte = antes.group("resto").strip()
        # "acceso calle El Taihuén 12600", "de Avenida Raúl Labbé 14.190": se quita lo que va antes de la calle
        parte = re.sub(
            rf"^(?:con\s+)?(?:(?:acceso|ingreso)\s+(?:general\s+|principal\s+)?)?(?:de\s+|por\s+)?(?={TIPOS_DE_CALLE}\s)",
            "",
            parte,
            flags=re.IGNORECASE,
        )
        if not parte or PARTES_QUE_NO_SON_CALLE.match(sin_tildes(parte)):
            continue
        tipo = CON_TIPO.match(parte)
        tipo_texto = tipo.group("tipo") if tipo else None

        con_numero = CON_NUMERO.match(parte)
        if con_numero:
            nombre = _sin_prefijos(con_numero.group("nombre"))  # paso 124f
            numero = con_numero.group("numero").replace(".", "")
            # Un nombre muy corto ("N", "Nº") no es una calle; "la bodega nº 206" tampoco
            # (pero si empieza con "Pasaje", "Avenida"... sí es calle: "Pasaje La Parcela número 40")
            largo_ok = len(re.sub(r"[^A-Za-zÁÉÍÓÚÑáéíóúñ]", "", nombre)) >= 3
            if largo_ok and (tipo_texto or not PARTES_QUE_NO_SON_CALLE.match(sin_tildes(nombre))):
                return _nombre_de_la_calle(tipo_texto, nombre), numero

        en_palabras = CON_NUMERO_EN_PALABRAS.match(parte)
        if en_palabras:
            numero = numero_en_palabras(en_palabras.group("palabras").split())
            nombre = _sin_prefijos(CON_TIPO.sub("", en_palabras.group("nombre")))
            if numero is not None and len(nombre) >= 3:
                return _nombre_de_la_calle(tipo_texto, nombre), str(numero)

        # Calle sin número, pero que se ve como calle ("Pasaje Los Aromos")
        if tipo_texto:
            nombre = re.split(rf"\s+(?:{MARCA_DE_NUMERO}|n)(?:\s|$)", CON_TIPO.sub("", parte), flags=re.IGNORECASE)[0]
            nombre = _sin_prefijos(nombre)  # paso 124f: "calle interior nº 982" no dice qué calle es
            if len(nombre) >= 3:
                return _nombre_de_la_calle(tipo_texto, nombre), None

    # Último intento: una calle con número en cualquier parte del texto
    for en_medio in CALLE_EN_MEDIO.finditer(direccion or ""):
        nombre = _sin_prefijos(en_medio.group("nombre"))
        if nombre:  # "Calle A nº 2.508" sí es una calle; "calle interior nº 982" no
            return _nombre_de_la_calle(en_medio.group("tipo"), nombre), en_medio.group("numero").replace(".", "")
    # Muchas veces el edificio o condominio se llama como su dirección: "edificio San Nicolás 1331"
    edificio = EDIFICIO_CON_NUMERO.search(direccion or "")
    if edificio:
        return _nombre_de_la_calle(None, edificio.group("nombre")), edificio.group("numero").replace(".", "")
    return None