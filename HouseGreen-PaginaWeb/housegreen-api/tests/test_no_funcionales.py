"""Paso 127: pruebas NO funcionales de la API: no revisan QUÉ hace HouseGreen, sino CÓMO lo hace
(rendimiento, seguridad y fiabilidad). Usan la rama 'pruebas' de Neon (ver conftest.py)."""
import math
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt
from sqlalchemy import event

from conftest import CLAVE

pytestmark = pytest.mark.no_funcional  # todas las pruebas de este archivo

# El catálogo completo (todos los remates de una vez) se pide UNA vez; después la web filtra sin volver a pedirlo.
# Medido el 08-11 en la red de la casa: 5,1 segundos con 1.321 remates.
SEGUNDOS_MAXIMOS_DEL_CATALOGO = 8
# El catálogo trae los datos relacionados de 7 tablas (financiero, legal, físico...) en bloques de 500 remates por
# consulta (así trabaja selectinload de SQLAlchemy), más unas 4 consultas fijas (remates, evaluaciones, fotos, factores).
TABLAS_RELACIONADAS = 7
REMATES_POR_CONSULTA = 500
CONSULTAS_FIJAS = 5  # 4 + 1 de margen


# ---------- Rendimiento ----------

def test_el_catalogo_responde_rapido(cliente):
    """Rendimiento: el catálogo completo (lo primero que ve cualquier persona) responde en menos de 8 segundos."""
    cliente.get("/propiedades")  # la primera vez la rama de Neon puede estar "despertando"
    inicio = time.perf_counter()
    respuesta = cliente.get("/propiedades")
    segundos = time.perf_counter() - inicio
    assert respuesta.status_code == 200
    assert segundos < SEGUNDOS_MAXIMOS_DEL_CATALOGO, f"El catálogo tardó {segundos:.1f} segundos"


def test_el_catalogo_no_hace_una_consulta_por_remate(cliente):
    """Eficiencia: el catálogo NO hace una consulta por remate: con 1.321 remates son unas 25 consultas, no miles.
    Cada 500 remates más, suma solo 7 consultas (una por tabla relacionada)."""
    from app.database import engine

    consultas = []

    def contar(*args):
        consultas.append(1)

    event.listen(engine, "before_cursor_execute", contar)
    try:
        remates = cliente.get("/propiedades").json()
    finally:
        event.remove(engine, "before_cursor_execute", contar)
    bloques = max(1, math.ceil(len(remates) / REMATES_POR_CONSULTA))
    limite = CONSULTAS_FIJAS + TABLAS_RELACIONADAS * bloques
    assert len(consultas) <= limite, f"{len(consultas)} consultas para {len(remates)} remates (máximo {limite})"


# ---------- Seguridad ----------

def test_solo_la_web_de_housegreen_puede_usar_la_api(cliente):
    """Seguridad (CORS): el navegador deja que la web de HouseGreen use la API, pero no otros sitios."""
    propia = cliente.options(
        "/auth/login", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"}
    )
    assert propia.headers.get("access-control-allow-origin") == "http://localhost:5173"
    ajena = cliente.options(
        "/auth/login", headers={"Origin": "https://sitio-falso.com", "Access-Control-Request-Method": "POST"}
    )
    assert ajena.status_code == 400
    assert "access-control-allow-origin" not in ajena.headers


def test_el_login_no_revela_que_correos_existen(cliente, crear_cuenta):
    """Seguridad: con una contraseña mala y con un correo que no existe la respuesta es la misma,
    así nadie puede averiguar quién tiene cuenta en HouseGreen."""
    cuenta = crear_cuenta()
    clave_mala = cliente.post("/auth/login", json={"email": cuenta.email, "password": "ClaveMala123"})
    sin_cuenta = cliente.post(
        "/auth/login", json={"email": f"nadie-{uuid.uuid4().hex[:10]}@example.com", "password": "ClaveMala123"}
    )
    assert clave_mala.status_code == sin_cuenta.status_code == 401
    assert clave_mala.json() == sin_cuenta.json() == {"detail": "Correo o contraseña incorrectos"}


def test_un_token_vencido_o_falso_no_sirve(cliente, crear_cuenta):
    """Seguridad: la sesión vence (el token dura 24 horas) y un token firmado con otra clave no sirve."""
    from app.auth.security import ALGORITHM, SECRET_KEY

    cuenta = crear_cuenta()
    vencido = jwt.encode(
        {"sub": cuenta.id, "email": cuenta.email, "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    falso = jwt.encode(
        {"sub": cuenta.id, "email": cuenta.email, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        "una-clave-que-no-es-la-de-housegreen",
        algorithm=ALGORITHM,
    )
    for token in (vencido, falso):
        assert cliente.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_el_inicio_de_sesion_queda_registrado_sin_la_contrasena(cliente, crear_cuenta):
    """Seguridad (trazabilidad): cada inicio de sesión queda en el registro de actividad, con la plataforma,
    y la contraseña nunca se guarda ahí."""
    from app.database import SessionLocal
    from app.models.audit import AuditLog

    cuenta = crear_cuenta()
    entrada = cliente.post("/auth/login", json={"email": cuenta.email, "password": CLAVE}, headers={"X-Plataforma": "web"})
    assert entrada.status_code == 200
    with SessionLocal() as db:
        filas = db.query(AuditLog).filter(AuditLog.email == cuenta.email).all()
    inicio = [fila for fila in filas if fila.action == "inicio_sesion"]
    assert len(inicio) == 1
    assert inicio[0].platform == "web"
    assert all(CLAVE not in f"{fila.old_value} {fila.new_value}" for fila in filas)


# ---------- Fiabilidad ----------

def test_los_datos_mal_escritos_no_botan_la_api(cliente, crear_cuenta, entrar):
    """Fiabilidad: un dato mal escrito recibe un error claro (4xx) y nunca un error del servidor (500)."""
    encabezado = entrar(crear_cuenta(premium=True))
    respuestas = {
        "id que no es un id": cliente.get("/propiedades/no-es-un-id", headers=encabezado),
        "remate que no existe": cliente.get(f"/propiedades/{uuid.uuid4()}", headers=encabezado),
        "correo mal escrito": cliente.post("/auth/login", json={"email": "no-es-un-correo", "password": "Clave2026"}),
        "login vacío": cliente.post("/auth/login", json={}),
        "nota con letras": cliente.post("/opiniones", json={"rating": "cinco", "topic": "catalogo"}, headers=encabezado),
    }
    codigos = {caso: respuesta.status_code for caso, respuesta in respuestas.items()}
    assert codigos == {
        "id que no es un id": 422,
        "remate que no existe": 404,
        "correo mal escrito": 422,
        "login vacío": 422,
        "nota con letras": 422,
    }