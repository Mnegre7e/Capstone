# Correos de HouseGreen (paso 99): se envían desde el Gmail del proyecto con su contraseña de aplicación.
# Si el .env no tiene las claves del correo, no se envía nada: el correo se muestra en la terminal.
# Así cualquier integrante puede trabajar sin las claves del Gmail.
# Paso A22: en Render (plan gratis) no se puede usar Gmail directo (bloquea los puertos de correo). Ahí los
# correos salen por un "puente": un script de Google del mismo Gmail (correo-google/Codigo.gs) al que la API
# le pide enviar el correo por HTTPS. Se usa si están CORREO_PUENTE_URL y CORREO_PUENTE_CLAVE.
import os
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

import requests
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


def _puente() -> tuple[str, str]:
    # Paso A22: la dirección del script de Google (termina en /exec) y la clave que el script pide
    return (os.getenv("CORREO_PUENTE_URL") or "").strip(), (os.getenv("CORREO_PUENTE_CLAVE") or "").strip()


def correo_configurado() -> bool:
    usuario, clave = _credenciales()
    url, clave_puente = _puente()
    return bool(usuario and clave) or bool(url and clave_puente)


def _enviar_por_el_puente(url: str, clave: str, destinatario: str, asunto: str, texto: str) -> None:
    """Paso A22: le pide al script de Google que envíe el correo. Si no lo envía, lanza un error (como Gmail)."""
    respuesta = requests.post(
        url,
        json={"clave": clave, "para": destinatario, "asunto": asunto, "texto": texto, "nombre": NOMBRE_REMITENTE},
        timeout=30,
    )
    try:
        datos = respuesta.json()
    except ValueError:
        datos = {}
    if respuesta.status_code != 200 or datos.get("ok") is not True:
        motivo = datos.get("error") or f"respuesta {respuesta.status_code}"
        raise RuntimeError(f"el puente de correo no envió el correo ({motivo})")

# Paso 116: dominios reservados para pruebas (no son de nadie). A esas direcciones nunca se envía nada:
# así las cuentas de prueba como jose@example.com no hacen que Gmail rebote correos.
DOMINIOS_DE_PRUEBA = {"example.com", "example.org", "example.net", "localhost"}
TERMINACIONES_DE_PRUEBA = (".example", ".invalid", ".localhost", ".test")


def es_correo_de_prueba(correo: str) -> bool:
    dominio = correo.rsplit("@", 1)[-1].strip().lower()
    return dominio in DOMINIOS_DE_PRUEBA or dominio.endswith(TERMINACIONES_DE_PRUEBA)

def enviar_correo(destinatario: str, asunto: str, texto: str) -> bool:
    """Envía un correo de texto. Devuelve True si salió por Gmail y False si solo se mostró en la terminal."""
    usuario, clave = _credenciales()
    
    if es_correo_de_prueba(destinatario):
        print(f"Correo NO enviado a {destinatario}: es una dirección de prueba.")
        return False

    # Paso A22: en Render, por el puente de Google
    url, clave_puente = _puente()
    if url and clave_puente:
        _enviar_por_el_puente(url, clave_puente, destinatario, asunto, texto)
        return True

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