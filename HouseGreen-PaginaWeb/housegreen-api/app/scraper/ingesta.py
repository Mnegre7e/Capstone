# Paso 118: carga completa de los remates en UN solo comando.
#
#   python -m app.scraper.ingesta               -> carga hecha a mano (queda registrada como "manual")
#   python -m app.scraper.ingesta --automatica  -> la usa el programa que la ejecuta solo cada día (paso 119)
#
# Qué hace, en orden:
#   1) Lee del sitio la lista de TODOS sus remates vigentes (una sola página, paso 118b) y se queda con los de la
#      Región Metropolitana: crea los nuevos y actualiza los que cambiaron de precio o fecha
#      (o que volvieron a aparecer después de estar retirados).
#   2) Lee la ficha de los remates nuevos, la de los que cambiaron de fecha, y la de cada remate vigente nuestro
#      que YA NO APARECE en el sitio: si su ficha dice que no existe, se marca como retirado.
#   3) Cada propiedad que cambia recalcula su semáforo (y avisa a quien tenga una alerta).
#   4) Guarda en la tabla ingestion_runs cuándo se hizo, cuánto duró y qué encontró.
import sys
import time
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models.ingesta import IngestionRun
from app.scraper import cargar_fichas as fichas
from app.scraper import cargar_remates as listados
from app.scraper.remates_scraper import leer_remates

# Una carga que lleva más que esto "en curso" se cortó sin terminar (se apagó el PC, se cayó internet...)
HORAS_PARA_DARLA_POR_CORTADA = 3
# En el detalle se guardan como máximo estos elementos por lista (para que la fila no quede gigante)
MAXIMO_POR_LISTA = 200


def _empezar(origen: str) -> int | None:
    """Anota que empieza una carga y devuelve su número.
    Devuelve None si ya hay otra en curso (así nunca corren dos a la vez)."""
    db = SessionLocal()
    try:
        limite = datetime.now(timezone.utc) - timedelta(hours=HORAS_PARA_DARLA_POR_CORTADA)
        db.query(IngestionRun).filter(IngestionRun.status == "en_curso", IngestionRun.started_at < limite).update(
            {IngestionRun.status: "fallida", IngestionRun.error_message: "Se cortó sin terminar."},
            synchronize_session=False,
        )
        db.commit()
        if db.query(IngestionRun).filter(IngestionRun.status == "en_curso").first():
            return None
        carga = IngestionRun(origin=origen, status="en_curso")
        db.add(carga)
        db.commit()
        return carga.id
    finally:
        db.close()


def _terminar(numero: int, estado: str, columnas: dict, detalle: dict, mensaje: str | None) -> None:
    db = SessionLocal()
    try:
        carga = db.get(IngestionRun, numero)
        carga.status = estado
        carga.finished_at = datetime.now(timezone.utc)
        for columna, valor in columnas.items():
            setattr(carga, columna, valor)
        carga.detail = detalle
        carga.error_message = mensaje
        db.commit()
    finally:
        db.close()


def _lista(elementos: list) -> list:
    return elementos[:MAXIMO_POR_LISTA]


def ejecutar(origen: str = "manual") -> int:
    """Hace la carga completa. Devuelve 0 si terminó (aunque sea con algunos errores) y 1 si falló entera."""
    numero = _empezar(origen)
    if numero is None:
        print("Ya hay otra carga en curso. Esta no se ejecuta, para no repetir el trabajo.")
        return 0

    inicio = time.monotonic()
    print(f"Carga n° {numero} ({origen}) empezó: {datetime.now():%d-%m-%Y %H:%M}")
    remates: list[dict] = []
    en_el_sitio = 0
    de_listados: dict | None = None
    de_fichas: dict | None = None
    mensaje: str | None = None

    try:
        print("\n1) Leyendo los remates que publica el sitio...")
        todos = leer_remates()
        en_el_sitio = len(todos)
        remates = listados.solo_region_metropolitana(todos)
        if not remates:
            # Si el sitio cambió su página, el programa leería 0 remates sin dar error: se avisa
            raise RuntimeError("El sitio no mostró ningún remate. Puede que haya cambiado su página.")
        print(f"   El sitio publica {en_el_sitio} remates; {len(remates)} son de la Región Metropolitana.")
        print("   Guardando los nuevos y los que cambiaron...")
        de_listados = listados.cargar(remates)
        listados.mostrar_resumen(de_listados)

        print("\n2) Leyendo las fichas nuevas y revisando las de los remates que ya no aparecen en el sitio...")
        de_fichas = fichas.cargar_fichas(
            ids_en_el_sitio={remate["remate_id"] for remate in todos},
            releer=set(de_listados["fecha_cambiada"]),
        )
        fichas.mostrar_resumen(de_fichas)
        if de_fichas["detenida"]:
            mensaje = de_fichas["detenida"]
    except KeyboardInterrupt:
        # Ctrl+C en la terminal: se anota igual, para que la próxima carga no la crea "en curso"
        mensaje = "Se detuvo a mano (Ctrl+C)."
        print("\n" + mensaje)
    except Exception as error:
        mensaje = f"{type(error).__name__}: {error}"[:2000]
        print("\nLa carga se cortó:", mensaje)

    de_listados = de_listados or {}
    de_fichas = de_fichas or {}
    errores = de_listados.get("con_error", []) + de_fichas.get("con_error", [])
    minutos = round((time.monotonic() - inicio) / 60, 1)

    if mensaje:
        estado = "fallida"
    elif errores:
        estado = "con_errores"
    else:
        estado = "completa"

    columnas = {
        "listed": len(remates),
        "created": de_listados.get("creados", 0),
        "updated": len(de_listados.get("actualizados", [])),
        "fichas_read": de_fichas.get("leidas", 0),
        "withdrawn": len(de_fichas.get("retiradas", [])),
        "errors": len(errores),
    }
    detalle = {
        "minutos": minutos,
        "en_el_sitio": en_el_sitio,  # remates de todo Chile que publicaba el sitio ese día
        "nuevos": _lista(de_listados.get("nuevos", [])),
        "actualizados": _lista(de_listados.get("actualizados", [])),
        "retirados": _lista(de_fichas.get("retiradas", [])),
        "fuera_del_listado": _lista(de_fichas.get("fuera_del_listado", [])),
        "fichas_nuevas": de_fichas.get("nuevas", 0),
        "fichas_revisadas": de_fichas.get("revisadas", 0),
        "errores": _lista(errores),
        "omitidos": {
            "sin_comuna": _lista(de_listados.get("sin_comuna", [])),
            "sin_precio": _lista(de_listados.get("sin_precio", [])),
            "tipo_desconocido": _lista(de_listados.get("tipo_desconocido", [])),
        },
    }
    _terminar(numero, estado, columnas, detalle, mensaje)

    print("\n" + "=" * 60)
    print(f"Carga n° {numero}: {estado.upper().replace('_', ' ')} en {minutos} minutos")
    print(
        f"Leídos {columnas['listed']} | nuevos {columnas['created']} | actualizados {columnas['updated']} | "
        f"fichas {columnas['fichas_read']} | retirados {columnas['withdrawn']} | errores {columnas['errors']}"
    )
    if mensaje:
        print("Motivo:", mensaje)
    return 1 if estado == "fallida" else 0


if __name__ == "__main__":
    sys.exit(ejecutar("automatica" if "--automatica" in sys.argv else "manual"))