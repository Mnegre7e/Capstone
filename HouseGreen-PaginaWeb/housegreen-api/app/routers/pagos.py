# Paso 122d: pago del plan Premium con Webpay Plus (Transbank), con su SDK oficial (transbank-sdk).
#
# Cómo funciona:
#   1) POST /pagos/webpay (con la sesión de la persona): se anota el pago como "pendiente" y se le pide a Transbank
#      una transacción por el precio del plan. Transbank entrega una dirección y un token.
#   2) La web manda a la persona a esa dirección: la página de pago de Transbank. Ahí escribe su tarjeta;
#      HouseGreen nunca ve los datos de la tarjeta.
#   3) Al terminar, Transbank devuelve a la persona a /pagos/webpay/retorno (esta API), con el token.
#   4) La API confirma la transacción con Transbank. Si quedó AUTORIZADA por el monto correcto, suma los días
#      de Premium. Después manda a la persona a la web: /premium/resultado?pago=<número del pago>.
#   Paso A4: si el pago se inició desde la app (encabezado X-Plataforma: app), Transbank vuelve a
#      /pagos/webpay/retorno-app y la persona termina en la app (APP_URL) en vez de la web.
#   Paso A15: si se inició desde la app INSTALADA en un teléfono Android (la que se sirve en http://localhost),
#      Transbank vuelve a /pagos/webpay/retorno-android, en la misma dirección con que el teléfono llegó a la API
#      (por ejemplo http://192.168.1.20:8000), y la persona termina en la app del teléfono.
#
# Ambiente: por defecto el de INTEGRACIÓN de Transbank (pruebas con tarjetas de prueba, sin dinero real),
# con las credenciales públicas de prueba que trae el SDK. Para cobrar de verdad hace falta contrato con
# Transbank y, en el .env: WEBPAY_AMBIENTE=produccion, WEBPAY_CODIGO_COMERCIO y WEBPAY_LLAVE_SECRETA
# (además de publicar la web y la API en internet con HTTPS, y poner sus direcciones en API_URL y WEB_URL).
import html
import json
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from transbank.common.integration_api_keys import IntegrationApiKeys
from transbank.common.integration_commerce_codes import IntegrationCommerceCodes
from transbank.webpay.webpay_plus.transaction import Transaction

from app.auth.dependencies import ROL_ADMIN_ID, get_current_user
from app.auth.premium import DIAS_PREMIUM, PRECIO_PREMIUM, ROLES_SIN_PAGO, ambiente_de_pago
from app.database import get_db
from app.models.pago import Pago
from app.models.user import User
from app.schemas.pago import PagoInicioOut, PagoOut, PlanOut

router = APIRouter(prefix="/pagos", tags=["Pagos"])


def _ambiente() -> str:
    return ambiente_de_pago()  # paso 122e: la regla quedó en app/auth/premium.py


def _api_url() -> str:
    # Dirección de esta API, a la que Transbank devuelve a la persona después de pagar.
    # Paso A22: publicada en Render, la dirección la entrega Render en RENDER_EXTERNAL_URL.
    return (os.getenv("API_URL") or os.getenv("RENDER_EXTERNAL_URL") or "http://localhost:8000").rstrip("/")


def _web_url() -> str:
    return (os.getenv("WEB_URL") or "http://localhost:5173").rstrip("/")


def _app_url() -> str:
    # Paso A4: dirección de la app HouseGreenM (npm start la abre en el puerto 4200)
    return (os.getenv("APP_URL") or "http://localhost:4200").rstrip("/")


def _desde_la_app(request: Request) -> bool:
    # La app manda "X-Plataforma: app" en todas sus peticiones (la web manda "web")
    return (request.headers.get("X-Plataforma") or "").strip().lower() == "app"


# Paso A15: la dirección de la app instalada en Android (Capacitor la sirve en http://localhost)
ORIGEN_ANDROID = "http://localhost"


def _volver_a_la_app_android(respuesta: RedirectResponse) -> HTMLResponse:
    """
    Paso A19: en el teléfono, la app vive en http://localhost DENTRO de la propia app (Capacitor la entrega sin
    internet). Si la API redirige hacia allá con un 303, el teléfono no se lo pasa a la app: busca un servidor
    "localhost" de verdad y falla (ERR_CONNECTION_REFUSED). Una página que se cambia sola sí entra a la app.
    """
    destino = respuesta.headers["location"]  # http://localhost/premium/resultado?pago=9
    pagina = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="1;url={html.escape(destino)}">
<title>HouseGreen</title>
</head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#f1f5f3;color:#0f3d30;text-align:center">
<p style="margin:40vh 16px 16px;font-size:18px">Volviendo a HouseGreen...</p>
<a href="{html.escape(destino)}" style="color:#15803d;font-weight:600">Toca aquí si no vuelve sola</a>
<script>window.location.replace({json.dumps(destino)});</script>
</body>
</html>"""
    return HTMLResponse(pagina)


def _desde_android(request: Request) -> bool:
    # El teléfono manda "Origin: http://localhost" (la app en el navegador del computador manda http://localhost:4200)
    return _desde_la_app(request) and (request.headers.get("origin") or "").rstrip("/") == ORIGEN_ANDROID


def _transbank() -> Transaction:
    if _ambiente() == "produccion":
        codigo = os.getenv("WEBPAY_CODIGO_COMERCIO")
        llave = os.getenv("WEBPAY_LLAVE_SECRETA")
        if not codigo or not llave:
            raise RuntimeError("Faltan WEBPAY_CODIGO_COMERCIO y WEBPAY_LLAVE_SECRETA en el .env")
        return Transaction.build_for_production(codigo, llave)
    # Integración: código de comercio y llave de prueba, públicos, que Transbank entrega para probar
    return Transaction.build_for_integration(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY)


def _orden_de_compra() -> str:
    # "HG" + fecha y hora + 6 letras al azar: 22 caracteres (Webpay acepta hasta 26) y nunca se repite
    return "HG" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S") + secrets.token_hex(3)


def _ir_al_resultado(pago: Pago | None, inicio: str) -> RedirectResponse:
    # 303: el navegador vuelve con GET aunque Transbank haya llegado con POST.
    # inicio = la dirección de la web o de la app (las dos tienen la página /premium/resultado)
    destino = f"{inicio}/premium/resultado"
    if pago is not None:
        destino += f"?pago={pago.id}"
    return RedirectResponse(destino, status_code=303)


@router.get("/plan", response_model=PlanOut)
def ver_plan():
    # Público: lo usa la página del plan (precio, días y si los pagos son de prueba)
    return PlanOut(precio=PRECIO_PREMIUM, dias=DIAS_PREMIUM, ambiente=_ambiente())


@router.post("/webpay", response_model=PagoInicioOut)
def iniciar_pago(request: Request, db: Session = Depends(get_db), usuario: User = Depends(get_current_user)):
    if usuario.role_id in ROLES_SIN_PAGO:
        raise HTTPException(status_code=400, detail="Tu cuenta ya ve todo sin necesidad del plan.")

    # El precio lo fija la API (no la web), así nadie puede pagar menos cambiando la página
    pago = Pago(
        user_id=usuario.id,
        buy_order=_orden_de_compra(),
        session_id=str(usuario.id),
        amount=PRECIO_PREMIUM,
        days=DIAS_PREMIUM,
        status="pendiente",
        environment=_ambiente(),
    )
    db.add(pago)
    db.commit()

    try:
        # Paso A4: Transbank devuelve a la persona a la API por un camino distinto según dónde empezó el pago
        if _desde_android(request):
            # Paso A15: al teléfono se le devuelve a la dirección con que llegó a la API (en el teléfono,
            # "localhost" sería el propio teléfono)
            retorno = f"{str(request.base_url).rstrip('/')}/pagos/webpay/retorno-android"
        else:
            camino = "/pagos/webpay/retorno-app" if _desde_la_app(request) else "/pagos/webpay/retorno"
            retorno = f"{_api_url()}{camino}"
        respuesta = _transbank().create(pago.buy_order, pago.session_id, pago.amount, retorno)
        pago.token = respuesta["token"]
        db.commit()
    except Exception as error:  # sin internet, Transbank caído, credenciales malas...
        db.rollback()
        pago = db.get(Pago, pago.id)
        pago.status = "error"
        pago.error_message = f"Al crear la transacción: {getattr(error, 'message', error)}"[:500]
        pago.finished_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=502, detail="No se pudo conectar con Webpay. Intenta de nuevo en unos minutos.")

    return PagoInicioOut(pago_id=pago.id, url=respuesta["url"], token=respuesta["token"])


def _procesar_retorno(
    db: Session, token_ws: str | None, tbk_token: str | None, tbk_orden: str | None, inicio: str | None = None
):
    ahora = datetime.now(timezone.utc)
    inicio = inicio or _web_url()

    # a) La persona apretó "Anular" en Webpay, o hubo un error en el formulario: llega TBK_TOKEN.
    # b) Se le acabó el tiempo para pagar: llega solo TBK_ORDEN_COMPRA.
    # En los dos casos NO se confirma nada con Transbank: no hubo cobro.
    if tbk_token or (tbk_orden and not token_ws):
        pago = None
        if tbk_token:
            pago = db.query(Pago).filter(Pago.token == tbk_token).first()
        if pago is None and tbk_orden:
            pago = db.query(Pago).filter(Pago.buy_order == tbk_orden).first()
        if pago is not None and pago.status == "pendiente":
            pago.status = "anulado"
            pago.error_message = "Se anuló en Webpay." if tbk_token else "Se acabó el tiempo para pagar en Webpay."
            pago.finished_at = ahora
            db.commit()
        return _ir_al_resultado(pago, inicio)

    if not token_ws:
        return _ir_al_resultado(None, inicio)

    pago = db.query(Pago).filter(Pago.token == token_ws).first()
    if pago is None:
        return _ir_al_resultado(None, inicio)
    if pago.status != "pendiente":
        return _ir_al_resultado(pago, inicio)  # ya se confirmó antes (por ejemplo, si recargó la página)

    try:
        respuesta = _transbank().commit(token_ws)
    except Exception as error:
        pago.status = "error"
        pago.error_message = f"Al confirmar la transacción: {getattr(error, 'message', error)}"[:500]
        pago.finished_at = ahora
        db.commit()
        return _ir_al_resultado(pago, inicio)

    tarjeta = (respuesta.get("card_detail") or {}).get("card_number") or ""
    pago.response_code = respuesta.get("response_code")
    pago.authorization_code = respuesta.get("authorization_code")
    pago.payment_type_code = respuesta.get("payment_type_code")
    pago.card_last_digits = tarjeta[-4:] or None
    pago.finished_at = ahora

    # Aprobado solo si Webpay lo autorizó y es por el monto y la orden de este pago
    aprobado = (
        respuesta.get("status") == "AUTHORIZED"
        and respuesta.get("response_code") == 0
        and int(respuesta.get("amount") or 0) == pago.amount
        and respuesta.get("buy_order") == pago.buy_order
    )
    if aprobado:
        usuario = db.get(User, pago.user_id)
        # Si todavía le quedaban días de Premium, los nuevos se suman al final
        desde = max(ahora, usuario.premium_until) if usuario.premium_until else ahora
        hasta = desde + timedelta(days=pago.days)
        usuario.premium_until = hasta
        pago.premium_from = desde
        pago.premium_until = hasta
        pago.status = "aprobado"
    else:
        pago.status = "rechazado"
        pago.error_message = f"Webpay respondió {respuesta.get('status')} (código {respuesta.get('response_code')})."
    db.commit()
    return _ir_al_resultado(pago, inicio)


# Transbank devuelve a la persona por GET o por POST (según el caso); se aceptan las dos formas.
@router.get("/webpay/retorno", include_in_schema=False)
def retorno_get(
    db: Session = Depends(get_db),
    token_ws: str | None = Query(None),
    tbk_token: str | None = Query(None, alias="TBK_TOKEN"),
    tbk_orden: str | None = Query(None, alias="TBK_ORDEN_COMPRA"),
):
    return _procesar_retorno(db, token_ws, tbk_token, tbk_orden)


@router.post("/webpay/retorno", include_in_schema=False)
def retorno_post(
    db: Session = Depends(get_db),
    token_ws: str | None = Form(None),
    tbk_token: str | None = Form(None, alias="TBK_TOKEN"),
    tbk_orden: str | None = Form(None, alias="TBK_ORDEN_COMPRA"),
):
    return _procesar_retorno(db, token_ws, tbk_token, tbk_orden)


# Paso A4: lo mismo, para los pagos que empezaron en la app: al terminar, la persona vuelve a la app
@router.get("/webpay/retorno-app", include_in_schema=False)
def retorno_app_get(
    db: Session = Depends(get_db),
    token_ws: str | None = Query(None),
    tbk_token: str | None = Query(None, alias="TBK_TOKEN"),
    tbk_orden: str | None = Query(None, alias="TBK_ORDEN_COMPRA"),
):
    return _procesar_retorno(db, token_ws, tbk_token, tbk_orden, _app_url())


@router.post("/webpay/retorno-app", include_in_schema=False)
def retorno_app_post(
    db: Session = Depends(get_db),
    token_ws: str | None = Form(None),
    tbk_token: str | None = Form(None, alias="TBK_TOKEN"),
    tbk_orden: str | None = Form(None, alias="TBK_ORDEN_COMPRA"),
):
    return _procesar_retorno(db, token_ws, tbk_token, tbk_orden, _app_url())


# Paso A15: lo mismo, para los pagos que empezaron en la app instalada en Android: vuelve a la app del teléfono
@router.get("/webpay/retorno-android", include_in_schema=False)
def retorno_android_get(
    db: Session = Depends(get_db),
    token_ws: str | None = Query(None),
    tbk_token: str | None = Query(None, alias="TBK_TOKEN"),
    tbk_orden: str | None = Query(None, alias="TBK_ORDEN_COMPRA"),
):
    return _volver_a_la_app_android(_procesar_retorno(db, token_ws, tbk_token, tbk_orden, ORIGEN_ANDROID))


@router.post("/webpay/retorno-android", include_in_schema=False)
def retorno_android_post(
    db: Session = Depends(get_db),
    token_ws: str | None = Form(None),
    tbk_token: str | None = Form(None, alias="TBK_TOKEN"),
    tbk_orden: str | None = Form(None, alias="TBK_ORDEN_COMPRA"),
):
    return _volver_a_la_app_android(_procesar_retorno(db, token_ws, tbk_token, tbk_orden, ORIGEN_ANDROID))


@router.get("/mios", response_model=list[PagoOut])
def mis_pagos(db: Session = Depends(get_db), usuario: User = Depends(get_current_user)):
    # Los pagos de la persona, del más nuevo al más antiguo (los mostrará su Perfil, paso 122e)
    return db.query(Pago).filter(Pago.user_id == usuario.id).order_by(Pago.created_at.desc()).all()


@router.get("/{pago_id}", response_model=PagoOut)
def ver_pago(pago_id: int, db: Session = Depends(get_db), usuario: User = Depends(get_current_user)):
    pago = db.get(Pago, pago_id)
    # Cada persona ve solo sus pagos (el administrador, todos)
    if pago is None or (pago.user_id != usuario.id and usuario.role_id != ROL_ADMIN_ID):
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return pago