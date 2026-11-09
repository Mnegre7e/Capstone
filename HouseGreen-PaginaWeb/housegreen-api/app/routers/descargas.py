# Paso A16: descargar la app para Android desde la página web.
# "npm run android:apk" (HouseGreenM/scripts/android.mjs) deja en housegreen-api/descargas:
#   - HouseGreen.apk: la app
#   - android.json: la dirección de la API con que se armó la app (ej. http://192.168.1.87:8000) y cuándo
# La web pregunta GET /descargas/android y muestra el botón y el código QR con la dirección de descarga.
# Es público (sin cuenta): cualquiera puede bajar la app. No hay nada en la base de datos.
import ipaddress
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

router = APIRouter(prefix="/descargas", tags=["Descargas"])

CARPETA_DESCARGAS = Path(__file__).resolve().parents[2] / "descargas"
NOMBRE_APK = "HouseGreen.apk"


def _datos_de_la_apk() -> dict:
    archivo = CARPETA_DESCARGAS / "android.json"
    if not archivo.is_file():
        return {}
    try:
        datos = json.loads(archivo.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return datos if isinstance(datos, dict) else {}


def _es_red_local(direccion: str) -> bool:
    # La app solo funciona en la misma red Wi-Fi si la API está en una dirección privada (192.168..., 10..., 172.16...)
    servidor = urlsplit(direccion).hostname or ""
    try:
        return ipaddress.ip_address(servidor).is_private
    except ValueError:
        return servidor == "localhost"


@router.get("/android")
def app_android(request: Request):
    apk = CARPETA_DESCARGAS / NOMBRE_APK
    if not apk.is_file():
        return {"disponible": False, "url": None, "tamano": None, "actualizada": None, "red_local": False}

    datos = _datos_de_la_apk()
    # La APK se descarga de la misma API con que se armó la app (la que el teléfono sabe encontrar)
    api = str(datos.get("api") or "").rstrip("/")
    if not api.startswith(("http://", "https://")):
        api = str(request.base_url).rstrip("/")
    creada = datos.get("creada")
    if not isinstance(creada, str):
        creada = datetime.fromtimestamp(apk.stat().st_mtime, tz=timezone.utc).isoformat()
    # Paso A20: ?v= cambia con cada APK nueva, así el teléfono nunca recibe una guardada de antes
    version = int(apk.stat().st_mtime)
    return {
        "disponible": True,
        "url": f"{api}/descargas/android/{NOMBRE_APK}?v={version}",
        "tamano": apk.stat().st_size,
        "actualizada": creada,
        "red_local": _es_red_local(api),
    }


@router.get(f"/android/{NOMBRE_APK}")
def descargar_app_android():
    apk = CARPETA_DESCARGAS / NOMBRE_APK
    if not apk.is_file():
        raise HTTPException(status_code=404, detail="La app para Android todavía no está publicada")
    # Paso A20: el nombre lleva la fecha ("HouseGreen-20261109-1940.apk"): en el teléfono se distingue la descarga
    # nueva de la anterior. Y no se guarda en la memoria del navegador, que podía entregar la versión anterior.
    creada = datetime.fromtimestamp(apk.stat().st_mtime)
    return FileResponse(
        apk,
        media_type="application/vnd.android.package-archive",
        filename=f"HouseGreen-{creada:%Y%m%d-%H%M}.apk",
        headers={"Cache-Control": "no-store"},
    )
