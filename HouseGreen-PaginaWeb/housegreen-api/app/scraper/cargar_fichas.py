# Paso 61: lee la ficha de cada remate que ya está en la base y guarda sus datos
# (tribunal, rol de la causa, modalidad, lugar, garantía, hora del remate y tipo de dominio).
#
# Se ejecuta con:
#   python -m app.scraper.cargar_fichas 5           -> lee solo 5 fichas (para probar)
#   python -m app.scraper.cargar_fichas             -> lee todas las que faltan
#
# Si se corta a la mitad no pasa nada: al ejecutarlo de nuevo sigue con las que faltan.
# Paso 118: lo normal ahora es no ejecutarlo solo, sino con "python -m app.scraper.ingesta", que hace todo.
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

from app.database import SessionLocal
from app.models.property import Property, PropertyAuctionInfo, PropertyLegalInfo
from app.routers.alerts import recalcular_semaforo_y_avisar
from app.scraper.cargar_remates import FUENTE
from app.scraper.ficha_remate import FichaIlegible, leer_ficha

ZONA_CHILE = ZoneInfo("America/Santiago")

# Paso 118: si fallan tantas fichas SEGUIDAS, el sitio no está respondiendo (o nos bloqueó):
# se deja de pedir para no insistir cientos de veces.
ERRORES_SEGUIDOS_PARA_PARAR = 10


def recortar(texto: str | None, largo: int) -> str | None:
    # Las columnas cortas de la base tienen un largo máximo; si el texto es más largo, se corta
    return texto[:largo] if texto else None


def guardar_ficha(db, propiedad: Property, ficha: dict) -> None:
    # 1) Datos del remate (si la propiedad ya tenía una fila, se actualiza)
    info = db.get(PropertyAuctionInfo, propiedad.id)
    if not info:
        info = PropertyAuctionInfo(property_id=propiedad.id)
        db.add(info)
    info.source_title = ficha["titulo"]
    info.origin = recortar(ficha["origen"], 100)
    info.court = recortar(ficha["tribunal"], 200)
    info.case_number = recortar(ficha["rol_causa"], 50)
    info.modality = recortar(ficha["modalidad"], 50)
    info.place = ficha["lugar"]
    info.guarantee_amount = ficha["garantia_monto"]
    info.guarantee_text = ficha["garantia"]
    info.payment_method = ficha["forma_pago"]
    info.payment_term = ficha["plazo"]
    info.requirements = ficha["requisitos"]
    info.conditions = ficha["condiciones"]
    info.announcement = ficha["anuncio"]
    info.observations = ficha["observaciones"]

    # 2) Fecha del remate: la ficha trae la hora, que el listado no tenía
    if ficha["fecha_hora"]:
        propiedad.auction_date = ficha["fecha_hora"]

    # 3) Tipo de dominio, para el factor Estado legal del semáforo
    legal = db.query(PropertyLegalInfo).filter_by(property_id=propiedad.id).first()
    if not legal:
        legal = PropertyLegalInfo(property_id=propiedad.id)
        db.add(legal)
    legal.domain_type = ficha["dominio"]

    db.commit()

    # 4) Paso 71: como cambió el dominio, se recalcula el semáforo de esta propiedad.
    #    Paso 98: si con eso mejora de nivel, se avisa a quienes tienen una alerta que ahora cumple.
    recalcular_semaforo_y_avisar(db, propiedad)


def cargar_fichas(
    maximo: int | None = None,
    ids_en_el_sitio: set[str] | None = None,
    releer: set[str] | None = None,
) -> dict:
    """Lee las fichas que faltan. Paso 118b, cuando lo llama la carga completa (ingesta.py):
    - ids_en_el_sitio: los números de TODOS los remates que el sitio publica hoy. Un remate vigente nuestro
      que ya no aparece ahí se vuelve a revisar: si su ficha dice que no existe (o ya no se puede leer), se retira.
    - releer: números de remates cuya ficha hay que volver a leer (por ejemplo, porque cambió su fecha)."""
    releer = releer or set()
    resumen = {
        "leidas": 0,
        "nuevas": 0,  # paso 118: fichas que se leían por primera vez
        "revisadas": 0,  # paso 118: fichas que ya se habían leído y se volvieron a revisar
        "con_hora": 0,
        "exclusivo": 0,
        "otro": [],
        "sin_dominio": 0,
        "retiradas": [],
        "con_error": [],
        "detenida": None,  # paso 118: motivo, si se dejó de leer porque el sitio no respondía
        "fuera_del_listado": [],  # paso 118b: vigentes que ya no están en el sitio pero cuya ficha sigue publicada
    }
    db = SessionLocal()
    try:
        ya_leidas = {property_id for (property_id,) in db.query(PropertyAuctionInfo.property_id)}
        # Primero las que se rematan antes
        del_scraper = (
            db.query(Property)
            .filter(Property.source_system == FUENTE, Property.source_reference.isnot(None))
            .filter(Property.status != "retirada")  # paso 71: las que el sitio ya retiró no se vuelven a pedir
            .order_by(Property.auction_date)
            .all()
        )

        # Paso 118: "vigente" = publicada en el catálogo y con el remate de hoy en adelante (o sin fecha)
        hoy = datetime.now(ZONA_CHILE).replace(hour=0, minute=0, second=0, microsecond=0)

        def es_vigente(propiedad: Property) -> bool:
            return propiedad.removed_at is None and (propiedad.auction_date is None or propiedad.auction_date >= hoy)

        def ya_no_esta_en_el_sitio(propiedad: Property) -> bool:
            return ids_en_el_sitio is not None and es_vigente(propiedad) and propiedad.source_reference not in ids_en_el_sitio

        pendientes = [
            propiedad
            for propiedad in del_scraper
            if propiedad.id not in ya_leidas
            or propiedad.source_reference in releer
            or ya_no_esta_en_el_sitio(propiedad)
        ]
        total_pendientes = len(pendientes)
        if maximo:
            pendientes = pendientes[:maximo]
        por_revisar = sum(1 for propiedad in pendientes if propiedad.id in ya_leidas)
        print(
            f"Fichas ya leídas antes: {len(ya_leidas)} | por leer: {total_pendientes} "
            f"| se leerán ahora: {len(pendientes)} (de ellas {por_revisar} ya leídas antes, para revisar si cambiaron)"
        )

        errores_seguidos = 0
        for numero, propiedad in enumerate(pendientes, start=1):
            # Se guardan antes de leer: si algo falla después, el commit/rollback no obliga a pedirlos de nuevo
            referencia = propiedad.source_reference
            titulo = propiedad.title
            era_nueva = propiedad.id not in ya_leidas
            fuera_del_sitio = ya_no_esta_en_el_sitio(propiedad)
            try:
                try:
                    ficha = leer_ficha(referencia)
                except FichaIlegible:
                    # La página respondió pero no se entiende. Solo se retira si ADEMÁS el remate ya no está
                    # en el listado del sitio (dos señales); si no, es un error y se revisa a mano.
                    if not fuera_del_sitio:
                        raise
                    ficha = None
                if not ficha:
                    # Paso 71: el sitio ya no tiene este remate ("Remate no encontrado"): se marca como retirado.
                    # No se borra: así no se pierden sus vistas ni quienes lo guardaron.
                    propiedad.status = "retirada"
                    db.commit()
                    resumen["retiradas"].append(f"{referencia} {titulo}")
                    errores_seguidos = 0
                    continue
                guardar_ficha(db, propiedad, ficha)
                if fuera_del_sitio:
                    # Ya no aparece en el listado, pero su ficha sigue publicada: se deja visible y se anota
                    resumen["fuera_del_listado"].append(f"{referencia} {titulo}")
            except Exception as error:
                # Si una ficha falla (sin conexión, dato raro), se anota y se sigue con la siguiente
                db.rollback()
                resumen["con_error"].append(f"{referencia}: {type(error).__name__}")
                errores_seguidos += 1
                if errores_seguidos >= ERRORES_SEGUIDOS_PARA_PARAR:
                    resumen["detenida"] = (
                        f"Fallaron {errores_seguidos} fichas seguidas (la última: {type(error).__name__}). "
                        "El sitio no está respondiendo o bloqueó la conexión."
                    )
                    print("  " + resumen["detenida"])
                    break
                continue

            errores_seguidos = 0
            resumen["leidas"] += 1
            resumen["nuevas" if era_nueva else "revisadas"] += 1
            if ficha["fecha_hora"] and (ficha["fecha_hora"].hour or ficha["fecha_hora"].minute):
                resumen["con_hora"] += 1
            if ficha["dominio"] == "exclusivo":
                resumen["exclusivo"] += 1
            elif ficha["dominio"] == "otro":
                resumen["otro"].append(f"{referencia} | {titulo} | {ficha['titulo']}")
            else:
                resumen["sin_dominio"] += 1

            if numero % 25 == 0:
                print(f"  ... {numero} de {len(pendientes)}")
    finally:
        db.close()
    return resumen


def mostrar_resumen(resumen: dict) -> None:
    print()
    print("Fichas leídas y guardadas:", resumen["leidas"], f"(nuevas {resumen['nuevas']}, revisadas {resumen['revisadas']})")
    print("  con hora del remate:    ", resumen["con_hora"])
    print("  dominio exclusivo:      ", resumen["exclusivo"])
    print("  otro dominio:           ", len(resumen["otro"]))
    print("  dominio sin especificar:", resumen["sin_dominio"])
    print("Retiradas por el sitio (marcadas):", len(resumen["retiradas"]), resumen["retiradas"])
    print("Con error:", len(resumen["con_error"]), resumen["con_error"])
    if resumen["detenida"]:
        print("Se dejó de leer:", resumen["detenida"])
    if resumen["fuera_del_listado"]:
        print("Ya no están en el listado del sitio, pero su ficha sigue publicada:", resumen["fuera_del_listado"])
    if resumen["otro"]:
        print()
        print("Remates marcados con OTRO dominio (para revisar):")
        for linea in resumen["otro"]:
            print("  -", linea[:150])


if __name__ == "__main__":
    # Si se escribe un número después del comando, se leen como máximo esas fichas
    maximo = int(sys.argv[1]) if len(sys.argv) > 1 else None
    mostrar_resumen(cargar_fichas(maximo))