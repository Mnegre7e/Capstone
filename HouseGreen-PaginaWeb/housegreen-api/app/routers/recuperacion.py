import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import NoReturn

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.auditoria import anotar
from app.auth.security import hash_password, problema_de_contrasena
from app.correo import enviar_correo
from app.models.recuperacion import PasswordReset
from app.models.user import User
from app.routers.auth import CUENTA_ELIMINADA  # el mismo mensaje del inicio de sesión
from app.schemas.recuperacion import CambiarConCodigo, PedirCodigo

# Paso 117 (RF-03): recuperar la contraseña con un código de 6 dígitos que llega por correo.
# 1) POST /auth/recuperar/pedir   → se envía el código (vale 15 minutos)
# 2) POST /auth/recuperar/cambiar → con el código se pone una contraseña nueva
# Paso 117b (decisión del equipo): si el correo no tiene cuenta se avisa al tiro, igual que en el registro
# ("Ese correo ya está registrado"). Cada intento queda en el registro de actividad.
router = APIRouter(prefix="/auth/recuperar", tags=["Autenticación"])

MINUTOS_DE_VIGENCIA = 15
INTENTOS_POR_CODIGO = 5  # después de 5 errores ese código ya no sirve
CODIGOS_CADA_15_MINUTOS = 3  # para que nadie llene de correos la bandeja de otra persona

SIN_CUENTA = "No hay ninguna cuenta con ese correo. Revisa que esté bien escrito o crea una cuenta."
CUENTA_SUSPENDIDA = "Esta cuenta está suspendida. Si crees que es un error, escribe a housegreen.capstone@gmail.com."
DEMASIADOS_PEDIDOS = "Ya te enviamos varios códigos. Espera unos minutos y usa el del último correo que te llegó."
CODIGO_INVALIDO = (
    "El código no es correcto o ya venció. Usa el código del último correo que te enviamos, o pide uno nuevo."
)
DEMASIADOS_ERRORES = "Escribiste mal el código demasiadas veces. Pide un código nuevo."


def _huella(codigo: str) -> str:
    """El código no se guarda: se guarda una huella hecha con la SECRET_KEY de la API.
    Aunque alguien leyera la tabla, no podría saber cuál es el código."""
    clave = (os.getenv("SECRET_KEY") or "").encode()
    return hmac.new(clave, codigo.encode(), hashlib.sha256).hexdigest()


def _con_zona(fecha: datetime) -> datetime:
    return fecha if fecha.tzinfo else fecha.replace(tzinfo=timezone.utc)  # la base guarda la hora en UTC


def _cuenta_que_puede_recuperar(db: Session, email: str) -> User | None:
    """La cuenta de ese correo, solo si está activa (las suspendidas o eliminadas no pueden recuperar)."""
    usuario = db.query(User).filter(User.email == email).first()
    if usuario is None or not usuario.is_active or usuario.deleted_at is not None:
        return None
    return usuario


def _rechazar(
    db: Session, request: Request, email: str, usuario: User | None, motivo: str, codigo_http: int, mensaje: str
) -> NoReturn:
    # Se anota en el registro de actividad (lo ve el administrador) y se responde el error
    anotar(db, "recuperacion_pedida", request=request, usuario=usuario, email=email, despues={"motivo": motivo})
    db.commit()
    raise HTTPException(status_code=codigo_http, detail=mensaje)


def _texto_del_correo(nombre: str, codigo: str) -> str:
    return "\n".join(
        [
            f"Hola {nombre}:",
            "",
            "Pediste cambiar la contraseña de tu cuenta en HouseGreen. Tu código es:",
            "",
            f"    {codigo[:3]} {codigo[3:]}",
            "",
            f"Escríbelo en la página para crear tu contraseña nueva. Vence en {MINUTOS_DE_VIGENCIA} minutos.",
            "",
            "Si no fuiste tú, ignora este correo: tu contraseña sigue siendo la misma.",
            "",
            "Equipo HouseGreen",
        ]
    )


def _enviar_codigo(destinatario: str, nombre: str, codigo: str) -> None:
    # Se ejecuta en segundo plano: si el correo falla, queda anotado en la terminal de la API
    try:
        enviar_correo(destinatario, "Tu código para cambiar la contraseña de HouseGreen", _texto_del_correo(nombre, codigo))
    except Exception as error:
        print(f"No se pudo enviar el código de recuperación a {destinatario}: {error}")


@router.post("/pedir")
def pedir_codigo(datos: PedirCodigo, request: Request, tareas: BackgroundTasks, db: Session = Depends(get_db)):
    email = datos.email.strip()
    if "@" not in email or len(email) > 150:
        raise HTTPException(status_code=400, detail="Escribe un correo válido.")

    usuario = db.query(User).filter(User.email == email).first()
    if usuario is None:
        _rechazar(db, request, email, None, "correo_no_registrado", 404, SIN_CUENTA)
    if usuario.deleted_at is not None:
        _rechazar(db, request, email, usuario, "cuenta_eliminada", 400, CUENTA_ELIMINADA)
    if not usuario.is_active:
        _rechazar(db, request, email, usuario, "cuenta_deshabilitada", 400, CUENTA_SUSPENDIDA)

    ahora = datetime.now(timezone.utc)
    pedidos_recientes = (
        db.query(PasswordReset)
        .filter(PasswordReset.user_id == usuario.id, PasswordReset.created_at >= ahora - timedelta(minutes=15))
        .count()
    )
    if pedidos_recientes >= CODIGOS_CADA_15_MINUTOS:
        _rechazar(db, request, email, usuario, "demasiados_pedidos", 429, DEMASIADOS_PEDIDOS)

    # Un número al azar de 6 dígitos (secrets: pensado para claves, no se puede adivinar)
    codigo = f"{secrets.randbelow(1_000_000):06d}"
    db.add(
        PasswordReset(
            user_id=usuario.id,
            code_hash=_huella(codigo),
            expires_at=ahora + timedelta(minutes=MINUTOS_DE_VIGENCIA),
            attempts=0,
        )
    )
    anotar(db, "recuperacion_pedida", request=request, usuario=usuario)
    db.commit()

    # El correo sale después de responder (enviarlo tarda uno o dos segundos)
    tareas.add_task(_enviar_codigo, usuario.email, usuario.full_name, codigo)
    return {"mensaje": f"Te enviamos un código de 6 dígitos a {usuario.email}."}


@router.post("/cambiar")
def cambiar_con_codigo(datos: CambiarConCodigo, request: Request, db: Session = Depends(get_db)):
    email = datos.email.strip()
    codigo = "".join(datos.code.split())  # "123 456" → "123456"

    # Primero las reglas de la contraseña: así un error en la contraseña no gasta intentos del código
    problema = problema_de_contrasena(datos.new_password)
    if problema:
        raise HTTPException(status_code=400, detail=problema)

    usuario = _cuenta_que_puede_recuperar(db, email)
    if usuario is None:
        raise HTTPException(status_code=400, detail="No hay ninguna cuenta activa con ese correo.")

    # Solo vale el ÚLTIMO código pedido que todavía no se ha usado
    pedido = (
        db.query(PasswordReset)
        .filter(PasswordReset.user_id == usuario.id, PasswordReset.used_at.is_(None))
        .order_by(PasswordReset.created_at.desc(), PasswordReset.id.desc())
        .first()
    )
    ahora = datetime.now(timezone.utc)
    if pedido is None or _con_zona(pedido.expires_at) < ahora:
        raise HTTPException(status_code=400, detail=CODIGO_INVALIDO)
    if pedido.attempts >= INTENTOS_POR_CODIGO:
        raise HTTPException(status_code=400, detail=DEMASIADOS_ERRORES)

    es_correcto = len(codigo) == 6 and codigo.isdigit() and hmac.compare_digest(pedido.code_hash, _huella(codigo))
    if not es_correcto:
        pedido.attempts += 1
        anotar(db, "recuperacion_fallida", request=request, usuario=usuario, despues={"intentos": pedido.attempts})
        db.commit()
        if pedido.attempts >= INTENTOS_POR_CODIGO:
            raise HTTPException(status_code=400, detail=DEMASIADOS_ERRORES)
        raise HTTPException(status_code=400, detail=CODIGO_INVALIDO)

    usuario.password_hash = hash_password(datos.new_password)
    # Este código y cualquier otro que haya quedado pendiente ya no sirven
    db.query(PasswordReset).filter(PasswordReset.user_id == usuario.id, PasswordReset.used_at.is_(None)).update(
        {PasswordReset.used_at: ahora}, synchronize_session=False
    )
    # Se anota QUE la recuperó, nunca la contraseña ni el código
    anotar(db, "contrasena_recuperada", request=request, usuario=usuario)
    db.commit()
    return {"mensaje": "Listo. Ya puedes iniciar sesión con tu contraseña nueva."}