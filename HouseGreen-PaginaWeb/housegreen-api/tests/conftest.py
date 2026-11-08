"""Paso 126: preparación de las pruebas automáticas de la API (PyTest).

Cómo correrlas, desde la carpeta housegreen-api (con el entorno virtual activo):
    pip install -r requirements-dev.txt
    pytest -v

- test_reglas.py no usa la base de datos: corre en cualquier computador.
- test_api.py llama a la API de verdad y usa una RAMA de Neon solo para pruebas
  (DATABASE_URL_PRUEBAS en el .env), NUNCA la base real: así puede crear cuentas sin tocar los datos de verdad.
  Si falta DATABASE_URL_PRUEBAS, esas pruebas se saltan (salen como "SKIPPED").
"""
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlsplit

import pyotp
import pytest
from cryptography.fernet import Fernet
from dotenv import load_dotenv

CARPETA_API = Path(__file__).resolve().parent.parent
load_dotenv(CARPETA_API / ".env")

URL_REAL = os.getenv("DATABASE_URL_NEON") or ""
URL_PRUEBAS = os.getenv("DATABASE_URL_PRUEBAS") or ""


def _servidor(url: str) -> str:
    return (urlsplit(url).hostname or "").lower()


# Seguridad: las pruebas nunca deben correr sobre la base real
if URL_PRUEBAS and (URL_PRUEBAS == URL_REAL or (_servidor(URL_PRUEBAS) and _servidor(URL_PRUEBAS) == _servidor(URL_REAL))):
    pytest.exit(
        "DATABASE_URL_PRUEBAS apunta a la base REAL. Debe ser la rama 'pruebas' de Neon. No se corrió ninguna prueba.",
        returncode=1,
    )

HAY_BASE = bool(URL_PRUEBAS)
SIN_BASE = "Falta DATABASE_URL_PRUEBAS en el .env (la rama 'pruebas' de Neon)"

# Esto tiene que pasar ANTES de importar la API (app/database.py lee DATABASE_URL_NEON al importarse).
# Sin rama de pruebas se pone una base en memoria que nunca se usa: así las pruebas de reglas igual corren.
os.environ["DATABASE_URL_NEON"] = URL_PRUEBAS or "sqlite://"
os.environ.setdefault("SECRET_KEY", "clave-solo-para-las-pruebas")
if not os.getenv("TWO_FA_KEY"):
    os.environ["TWO_FA_KEY"] = Fernet.generate_key().decode()

CLAVE = "Prueba2026"  # la contraseña de todas las cuentas de prueba
ROL_INVERSIONISTA, ROL_ANALISTA, ROL_ADMIN = 1, 2, 3


@pytest.fixture(scope="session")
def cliente():
    """La API completa, sin levantar el servidor (TestClient)."""
    if not HAY_BASE:
        pytest.skip(SIN_BASE)
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as cliente_de_prueba:
        yield cliente_de_prueba


@pytest.fixture(scope="session")
def crear_cuenta(cliente):
    """Crea una cuenta nueva en la rama de pruebas, con un correo distinto cada vez (pytest-xxxx@example.com)."""
    from app.auth import two_factor
    from app.auth.security import hash_password
    from app.database import SessionLocal
    from app.models.user import User

    hash_de_la_clave = hash_password(CLAVE)  # una sola vez: bcrypt es lento a propósito

    def crear(rol: int = ROL_INVERSIONISTA, premium: bool = False, dos_pasos: bool = False) -> SimpleNamespace:
        marca = uuid.uuid4().hex[:10]
        clave_dos_pasos = pyotp.random_base32() if dos_pasos else None
        with SessionLocal() as db:
            cuenta = User(
                email=f"pytest-{marca}@example.com",
                password_hash=hash_de_la_clave,
                full_name=f"Pytest {marca}",
                role_id=rol,
                premium_until=datetime.now(timezone.utc) + timedelta(days=30) if premium else None,
                two_fa_enabled=dos_pasos,
                two_fa_secret=two_factor.cifrar(clave_dos_pasos) if dos_pasos else None,
            )
            db.add(cuenta)
            db.commit()
            return SimpleNamespace(id=str(cuenta.id), email=cuenta.email, marca=marca, clave_dos_pasos=clave_dos_pasos)

    return crear


@pytest.fixture(scope="session")
def entrar(cliente):
    """Inicia sesión con una cuenta de prueba y devuelve el encabezado con el token."""

    def iniciar(cuenta: SimpleNamespace) -> dict:
        datos = {"email": cuenta.email, "password": CLAVE}
        if cuenta.clave_dos_pasos:
            datos["code"] = pyotp.TOTP(cuenta.clave_dos_pasos).now()
        respuesta = cliente.post("/auth/login", json=datos)
        assert respuesta.status_code == 200, respuesta.text
        return {"Authorization": f"Bearer {respuesta.json()['access_token']}"}

    return iniciar


@pytest.fixture(scope="session")
def un_remate(cliente):
    """El id de un remate del catálogo (la rama de pruebas trae los remates copiados de la base real)."""
    remates = cliente.get("/propiedades").json()
    if not remates:
        pytest.skip("La rama de pruebas no tiene remates en el catálogo")
    return remates[0]["id"]
