# Paso 124d: remates repetidos.
#
#   python -m app.scraper.duplicados   -> revisa todos los remates, esconde los repetidos y muestra cuáles son
#
# La carga diaria (ingesta.py) también lo hace, y un remate nuevo que ya estaba queda escondido al cargarlo.
#
# El sitio de remates a veces publica el MISMO remate dos, tres o cuatro veces, cada vez con otro número
# (por ejemplo, cuando el aviso salió en más de un diario). La carga guarda un remate por cada número del sitio,
# así que quedaban repetidos en el catálogo, el mapa y los reportes.
# Ahora, de cada grupo de repetidos se muestra UNO solo: el que ya se mostraba o, si no, el que se cargó primero.
# Los demás quedan con duplicate_of = el que se muestra. No se borra nada (siguen actualizándose igual).
#
# Dos remates son el mismo si se cumple todo esto:
#   1) Son de la misma comuna y se rematan el mismo día.
#   2) Su precio mínimo se diferencia en 2 % o menos (el sitio los pasa de UF a pesos en días distintos).
#   3) Tienen la misma calle y número. Si ninguno trae número, el lugar está escrito casi igual
#      ("Lote 7, Hijuela La Ensenada de Águila Sur, Paine").
#   4) No son unidades distintas del mismo edificio: si los dos dicen qué departamento es, tiene que ser el mismo
#      (lo mismo con estacionamiento, bodega, casa, lote, sitio, local, oficina y parcela).
#      Así, "Av. Independencia 733, depto 1007" y "Av. Independencia 733, depto 1701" siguen siendo dos remates.
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from app.database import SessionLocal
from app.models.alert import Alert
from app.models.favorite import SavedProperty
from app.models.property import Comuna, Property, PropertyView
from app.scraper.direcciones import MARCA_DE_NUMERO, NUMEROS_EN_PALABRAS, calle_y_numero, numero_en_palabras, sin_tildes

FUENTE = "rematesinmobiliarios"  # la misma de cargar_remates.py
ZONA_CHILE = ZoneInfo("America/Santiago")
DIFERENCIA_DE_PRECIO = Decimal("0.02")  # 2 %: la misma tolerancia que usa cargar_remates.py para la UF del día
PALABRAS_EN_COMUN = 0.8  # sin número de calle: el 80 % de las palabras del lugar tienen que coincidir
MAXIMO_POR_LISTA = 200

# "departamento 510", "estacionamientos 21, 34 y 35", "bodega número diez", "Casa H"
UNIDAD = re.compile(
    r"\b(?P<tipo>departamento|depto|dpto|estacionamiento|bodega|casa|lote|sitio|local|oficina|parcela)(?:e?s)?\b\.?\s*"
    rf"(?:{MARCA_DE_NUMERO}\s*)?(?P<resto>.{{0,60}})"
)
OTRO_NOMBRE = {"depto": "departamento", "dpto": "departamento"}
LISTA_DE_NUMEROS = re.compile(r"\s*([a-z]?-?\d[\w-]*(?:\s*(?:,|y)\s*[a-z]?-?\d[\w-]*)*)")
UNA_LETRA = re.compile(r"\s*([a-z])(?=\s*(?:[,;.]|$))")

# Palabras que no dicen DÓNDE está (se ignoran al comparar el lugar de los remates sin número de calle)
PALABRAS_GENERICAS = {
    "comuna", "region", "metropolitana", "santiago", "chile", "numero", "calle", "avenida", "pasaje", "camino", "piso",
    "subdivision", "division", "manzana", "plano", "loteo", "conjunto", "habitacional", "poblacion", "villa",
    "sector", "ubicado", "ubicada", "acceso", "principal", "denominado", "denominada", "resto", "hijuela", "fundo",
    "predio", "parcela", "lote", "sitio", "casa", "departamento", "estacionamiento", "bodega", "local", "oficina",
    "etapa", "edificio", "condominio", "torre", "inmueble", "propiedad", "derechos", "respectivo", "localidad",
}


def _identificadores(resto: str) -> set[str]:
    """Lo que viene después de "departamento": "510, piso 5" -> {"510"}; "21, 34 y 35" -> {"21", "34", "35"};
    "seiscientos once, del sexto piso" -> {"611"}; "h, condominio" -> {"h"}. Vacío si no dice cuál es."""
    lista = LISTA_DE_NUMEROS.match(resto)
    if lista:
        numeros = set()
        for parte in re.split(r"\s*(?:,|y)\s*", lista.group(1)):
            digitos = re.sub(r"\D", "", parte)  # "1103-e" -> "1103", "a-15" -> "15"
            if digitos:
                numeros.add(digitos.lstrip("0") or "0")  # "046" y "46" son el mismo
        return numeros
    en_palabras = numero_en_palabras(re.findall(r"[a-z]+", resto)[:6])
    if en_palabras is not None:
        return {str(en_palabras)}
    letra = UNA_LETRA.match(resto)
    if letra and letra.group(1) not in ("y", "o", "e"):
        return {letra.group(1)}
    return set()


def _unidades(texto: str) -> dict[str, set[str]]:
    """{"departamento": {"605"}, "estacionamiento": {"6"}, "bodega": {"11"}} (texto sin tildes y en minúsculas)"""
    unidades = defaultdict(set)
    for encontrada in UNIDAD.finditer(texto):
        tipo = OTRO_NOMBRE.get(encontrada.group("tipo"), encontrada.group("tipo"))
        unidades[tipo] |= _identificadores(encontrada.group("resto"))
    return unidades


def _palabras_del_lugar(texto: str, comuna: str) -> set[str]:
    """Las palabras que dicen dónde está: "hijuela la ensenada de aguila sur, paine" -> {"ensenada", "aguila"}"""
    de_la_comuna = set(re.findall(r"[a-z]{4,}", sin_tildes(comuna)))
    return {
        palabra
        for palabra in re.findall(r"[a-z]{4,}", texto)
        if palabra not in PALABRAS_GENERICAS and palabra not in de_la_comuna and palabra not in NUMEROS_EN_PALABRAS
    }


def _calle(direccion: str | None) -> tuple[str, str] | None:
    """("americo vespucio", "1456"): sin tildes, sin "Avenida"/"Pasaje" y sin ceros a la izquierda."""
    partes = calle_y_numero(direccion)
    if not partes or not partes[1]:
        return None
    calle = re.sub(r"^(?:avenida|pasaje|camino|calle|diagonal)\s+", "", sin_tildes(partes[0]).strip())
    return calle, partes[1].lstrip("0") or "0"


def datos_para_comparar(propiedad: Property, nombre_comuna: str) -> dict:
    texto = sin_tildes(propiedad.address or "")
    return {
        "dia": propiedad.auction_date.astimezone(ZONA_CHILE).date() if propiedad.auction_date else None,
        "precio": Decimal(propiedad.opening_price or 0),
        "calle": _calle(propiedad.address),
        "unidades": _unidades(texto),
        "lugar": _palabras_del_lugar(texto, nombre_comuna),
        "texto": " ".join(re.findall(r"[a-z0-9]+", texto)),
    }


def son_el_mismo_remate(a: dict, b: dict) -> bool:
    """a y b son de la misma comuna (eso lo revisa quien llama). Ver las 4 reglas al principio del archivo."""
    if a["dia"] is None or a["dia"] != b["dia"]:
        return False
    mayor = max(a["precio"], b["precio"])
    if mayor <= 0 or abs(a["precio"] - b["precio"]) > mayor * DIFERENCIA_DE_PRECIO:
        return False
    for tipo in a["unidades"].keys() & b["unidades"].keys():
        if a["unidades"][tipo] and b["unidades"][tipo] and not (a["unidades"][tipo] & b["unidades"][tipo]):
            return False  # los dos dicen qué departamento (o bodega...) es, y no es el mismo
    if a["calle"] or b["calle"]:
        return a["calle"] == b["calle"]
    # Ninguno trae calle y número: el lugar tiene que estar escrito casi igual
    if a["texto"] and a["texto"] == b["texto"]:
        return True
    menor = min(len(a["lugar"]), len(b["lugar"]))
    return menor > 0 and len(a["lugar"] & b["lugar"]) / menor >= PALABRAS_EN_COMUN


def buscar_original(db, propiedad: Property) -> Property | None:
    """Al cargar un remate nuevo: si es el mismo que uno que ya se muestra, devuelve ese (si no, None)."""
    if propiedad.auction_date is None:
        return None
    dia = propiedad.auction_date.astimezone(ZONA_CHILE).date()
    inicio = datetime(dia.year, dia.month, dia.day, tzinfo=ZONA_CHILE)
    candidatos = (
        db.query(Property)
        .filter(
            Property.comuna_id == propiedad.comuna_id,
            Property.id != propiedad.id,
            Property.source_system == propiedad.source_system,
            Property.status != "retirada",
            Property.duplicate_of.is_(None),
            Property.auction_date >= inicio,
            Property.auction_date < inicio + timedelta(days=1),
        )
        .order_by(Property.created_at)
        .all()
    )
    if not candidatos:
        return None
    comuna = db.get(Comuna, propiedad.comuna_id)
    nombre = comuna.name if comuna else ""
    datos = datos_para_comparar(propiedad, nombre)
    for candidato in candidatos:
        if son_el_mismo_remate(datos, datos_para_comparar(candidato, nombre)):
            return candidato
    return None


def _pasar_al_original(db, repetido: Property, original: Property) -> None:
    """Un remate que se mostraba deja de mostrarse: lo que la gente tenía de él pasa al que se muestra
    (sus favoritos, sus avisos y sus visitas). Así nadie pierde un favorito ni queda con un aviso que no abre."""
    ahora = datetime.now(timezone.utc)
    favoritos = db.query(SavedProperty).filter(SavedProperty.property_id == repetido.id, SavedProperty.removed_at.is_(None))
    for favorito in favoritos.all():
        del_original = (
            db.query(SavedProperty)
            .filter(SavedProperty.user_id == favorito.user_id, SavedProperty.property_id == original.id)
            .first()
        )
        if del_original is None:
            favorito.property_id = original.id
            continue
        if del_original.removed_at is not None:  # lo había guardado y quitado: se vuelve a activar
            del_original.removed_at = None
            del_original.saved_at = favorito.saved_at
            del_original.notes = del_original.notes or favorito.notes
        favorito.removed_at = ahora  # ya tiene guardado el que se muestra
    db.query(Alert).filter(Alert.property_id == repetido.id).update(
        {Alert.property_id: original.id}, synchronize_session=False
    )
    db.query(PropertyView).filter(PropertyView.property_id == repetido.id).update(
        {PropertyView.property_id: original.id}, synchronize_session=False
    )


def _texto(propiedad: Property) -> str:
    return f"{propiedad.source_reference} {propiedad.title}"


def marcar_duplicados(db, desde: datetime | None = None, mostrar: bool = False) -> dict:
    """Revisa todos los remates del sitio (menos los retirados) y deja UNO visible por cada grupo de repetidos.
    desde: el inicio de la carga, para anotar también los repetidos que se cargaron en ella.
    mostrar: escribe cada grupo en la terminal."""
    resumen = {"grupos": 0, "escondidos": 0, "cambios": [], "con_error": []}
    comunas = dict(db.query(Comuna.id, Comuna.name).all())
    propiedades = (
        db.query(Property)
        .filter(Property.source_system == FUENTE, Property.status != "retirada", Property.auction_date.isnot(None))
        .order_by(Property.created_at, Property.id)  # de la que se cargó primero a la última
        .all()
    )
    # Solo se comparan los de la misma comuna y el mismo día
    por_dia = defaultdict(list)
    for propiedad in propiedades:
        datos = datos_para_comparar(propiedad, comunas.get(propiedad.comuna_id, ""))
        por_dia[(propiedad.comuna_id, datos["dia"])].append((propiedad, datos))

    for (comuna_id, _), lista in por_dia.items():
        # Cada remate entra al primer grupo con el que calza con TODOS (si no, empieza un grupo nuevo)
        grupos: list[list] = []
        for propiedad, datos in lista:
            for grupo in grupos:
                if all(son_el_mismo_remate(datos, otro) for _, otro in grupo):
                    grupo.append((propiedad, datos))
                    break
            else:
                grupos.append([(propiedad, datos)])

        for grupo in grupos:
            miembros = [propiedad for propiedad, _ in grupo]
            visibles = [propiedad for propiedad in miembros if propiedad.duplicate_of is None]
            original = (visibles or miembros)[0]  # el que ya se mostraba; si no, el que se cargó primero
            if len(miembros) > 1:
                resumen["grupos"] += 1
                if mostrar:
                    print(f"\n   {comunas.get(comuna_id, 'Sin comuna')}, {grupo[0][1]['dia']:%d-%m-%Y}:")
            for propiedad in miembros:
                nuevo = None if propiedad is original else original.id
                if len(miembros) > 1 and mostrar:
                    marca = "se muestra " if nuevo is None else "repetido   "
                    print(f"     {marca} {propiedad.source_reference:>6}  ${int(propiedad.opening_price):,}  {(propiedad.address or '')[:90]}")
                if propiedad.duplicate_of != nuevo:
                    if nuevo is not None and propiedad.duplicate_of is None:
                        _pasar_al_original(db, propiedad, original)
                    propiedad.duplicate_of = nuevo
                    resumen["cambios"].append(
                        f"{_texto(propiedad)}: repetido de {original.source_reference}"
                        if nuevo
                        else f"{_texto(propiedad)}: se vuelve a mostrar"
                    )
                elif nuevo is not None and desde is not None and propiedad.created_at and propiedad.created_at >= desde:
                    resumen["cambios"].append(f"{_texto(propiedad)}: repetido de {original.source_reference}")
                if nuevo is not None:
                    resumen["escondidos"] += 1
    db.commit()
    resumen["cambios"] = resumen["cambios"][:MAXIMO_POR_LISTA]
    return resumen


def revisar_todos(desde: datetime | None = None, mostrar: bool = False) -> dict:
    db = SessionLocal()
    try:
        return marcar_duplicados(db, desde=desde, mostrar=mostrar)
    finally:
        db.close()


def mostrar_resumen(resumen: dict) -> None:
    print(
        f"   Hay {resumen['grupos']} remates publicados más de una vez: se muestra uno de cada uno "
        f"y quedan escondidos {resumen['escondidos']} repetidos."
    )
    for cambio in resumen["cambios"]:
        print(f"   ~ {cambio}")


if __name__ == "__main__":
    print("Buscando remates repetidos...")
    resumen = revisar_todos(mostrar=True)
    print()
    mostrar_resumen(resumen)
    sys.exit(0)