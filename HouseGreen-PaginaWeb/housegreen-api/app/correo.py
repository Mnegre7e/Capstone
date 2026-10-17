# Correos de HouseGreen (paso 99): se envían desde el Gmail del proyecto con su contraseña de aplicación.
# Si el .env no tiene las claves del correo, no se envía nada: el correo se muestra en la terminal.
# Así cualquier integrante puede trabajar sin las claves del Gmail.
import os
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from dotenv import load_dotenv

# Lee el .env aquí también, por si este archivo se carga antes que database.py
load_dotenv()

SERVIDOR = "smtp.gmail.com"
PUERTO = 587  # puerto de Gmail para enviar con conexión cifrada (STARTTLS)
NOMBRE_REMITENTE = "HouseGreen"


def _credenciales() -> tuple[str, str]:
    usuario = (os.getenv("CORREO_USUARIO") or "").strip()
    # Google muestra la clave en 4 grupos con espacios: se quitan por si se copió así
    clave = (os.getenv("CORREO_CLAVE") or "").replace(" ", "").strip()
    return usuario, clave


def correo_configurado() -> bool:
    usuario, clave = _credenciales()
    return bool(usuario and clave)


def enviar_correo(destinatario: str, asunto: str, texto: str) -> bool:
    """Envía un correo de texto. Devuelve True si salió por Gmail y False si solo se mostró en la terminal."""
    usuario, clave = _credenciales()

    mensaje = EmailMessage()
    mensaje["From"] = formataddr((NOMBRE_REMITENTE, usuario or "sin-configurar@housegreen"))
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)

    if not (usuario and clave):
        # Modo prueba: sin claves en el .env, el correo solo se muestra en la terminal
        print("----- CORREO (modo prueba: falta CORREO_USUARIO o CORREO_CLAVE en el .env) -----")
        print(f"Para: {destinatario}")
        print(f"Asunto: {asunto}")
        print(texto)
        print("-------------------------------------------------------------------------------")
        return False

    with smtplib.SMTP(SERVIDOR, PUERTO, timeout=20) as servidor:
        servidor.starttls()  # desde aquí la conexión va cifrada
        servidor.login(usuario, clave)
        servidor.send_message(mensaje)
    return True


# Prueba del paso 99:
#   python -m app.correo                  → envía a la bandeja del propio Gmail del proyecto (con "+prueba")
#   python -m app.correo otro@correo.com  → envía a esa dirección
if __name__ == "__main__":
    import sys

    usuario, _ = _credenciales()
    if len(sys.argv) > 1:
        destino = sys.argv[1]
    elif usuario and "@" in usuario:
        nombre, dominio = usuario.split("@", 1)
        destino = f"{nombre}+prueba@{dominio}"  # llega a la misma bandeja del Gmail del proyecto
    else:
        destino = "prueba@example.com"

    enviado = enviar_correo(
        destino,
        "Prueba de HouseGreen",
        "Hola:\n\nSi lees esto, la API de HouseGreen ya puede enviar correos.\n\nEquipo HouseGreen",
    )
    if enviado:
        print(f"Correo enviado a {destino}. Revisa esa bandeja de entrada.")