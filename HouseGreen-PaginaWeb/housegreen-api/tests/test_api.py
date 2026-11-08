"""Paso 126: pruebas de la API de verdad (inicio de sesión, permisos, Premium y reportes).
Usan la rama 'pruebas' de Neon (ver conftest.py). Cada prueba crea sus propias cuentas."""
import uuid

import pyotp

from conftest import CLAVE, ROL_ADMIN, ROL_ANALISTA


# ---------- Cuentas e inicio de sesión ----------

def test_sin_sesion_no_hay_perfil(cliente):
    assert cliente.get("/auth/me").status_code == 401
    assert cliente.get("/auth/me", headers={"Authorization": "Bearer token-falso"}).status_code == 401


def test_registro_e_inicio_de_sesion(cliente):
    correo = f"pytest-{uuid.uuid4().hex[:10]}@example.com"
    registro = cliente.post("/auth/registro", json={"email": correo, "password": CLAVE, "full_name": "Persona de Prueba"})
    assert registro.status_code == 200, registro.text

    login = cliente.post("/auth/login", json={"email": correo, "password": CLAVE})
    assert login.status_code == 200, login.text
    perfil = cliente.get("/auth/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"}).json()
    assert perfil["email"] == correo
    assert perfil["role_name"] == "inversionista"  # quien se registra solo es inversionista
    assert perfil["acceso_completo"] is False  # y no tiene Premium


def test_registro_rechaza_datos_malos(cliente, crear_cuenta):
    debil = cliente.post("/auth/registro", json={"email": "pytest-debil@example.com", "password": "abc", "full_name": "Prueba"})
    assert debil.status_code == 400
    repetido = cliente.post("/auth/registro", json={"email": crear_cuenta().email, "password": CLAVE, "full_name": "Prueba"})
    assert repetido.status_code == 400
    assert "ya está registrado" in repetido.json()["detail"]


def test_bloqueo_tras_5_intentos_fallidos(cliente, crear_cuenta):
    cuenta = crear_cuenta()
    for _ in range(5):
        fallo = cliente.post("/auth/login", json={"email": cuenta.email, "password": "ClaveMala123"})
        assert fallo.status_code == 401
        assert fallo.json()["detail"] == "Correo o contraseña incorrectos"  # mensaje genérico
    # Al sexto intento se bloquea, aunque ahora la contraseña sea la correcta
    bloqueado = cliente.post("/auth/login", json={"email": cuenta.email, "password": CLAVE})
    assert bloqueado.status_code == 429


# ---------- Plan Premium ----------

def test_catalogo_sin_premium_no_muestra_el_semaforo(cliente, crear_cuenta, entrar):
    for encabezado in ({}, entrar(crear_cuenta())):  # sin cuenta y con cuenta sin Premium
        remates = cliente.get("/propiedades", headers=encabezado)
        assert remates.status_code == 200
        assert all(remate["evaluation"] is None and remate["description"] is None for remate in remates.json())


def test_sin_premium_no_hay_detalle_mapa_ni_favoritos(cliente, crear_cuenta, entrar, un_remate):
    encabezado = entrar(crear_cuenta())
    assert cliente.get(f"/propiedades/{un_remate}", headers=encabezado).status_code == 402
    assert cliente.get("/mapa", headers=encabezado).status_code == 402
    assert cliente.post(f"/favoritos/{un_remate}", json={}, headers=encabezado).status_code == 402


def test_con_premium_ve_el_detalle_y_guarda_favoritos(cliente, crear_cuenta, entrar, un_remate):
    encabezado = entrar(crear_cuenta(premium=True))
    detalle = cliente.get(f"/propiedades/{un_remate}", headers=encabezado)
    assert detalle.status_code == 200
    assert detalle.json()["id"] == un_remate
    assert cliente.get("/mapa", headers=encabezado).status_code == 200

    assert cliente.post(f"/favoritos/{un_remate}", json={}, headers=encabezado).status_code == 200
    guardados = cliente.get("/favoritos", headers=encabezado).json()
    assert un_remate in [str(favorito["property_id"]) for favorito in guardados]
    assert cliente.delete(f"/favoritos/{un_remate}", headers=encabezado).status_code == 200
    assert cliente.get("/favoritos", headers=encabezado).json() == []


def test_precio_del_plan(cliente):
    plan = cliente.get("/pagos/plan").json()
    assert (plan["precio"], plan["dias"]) == (9990, 30)


# ---------- Reportes: quién ve qué ----------

def test_el_inversionista_no_ve_reportes(cliente, crear_cuenta, entrar):
    encabezado = entrar(crear_cuenta(premium=True))
    assert cliente.get("/reportes", headers=encabezado).status_code == 403
    assert cliente.get("/reportes/buscar?q=casa", headers=encabezado).status_code == 403


def test_el_analista_ve_solo_totales(cliente, crear_cuenta, entrar):
    persona = crear_cuenta()
    encabezado = entrar(crear_cuenta(rol=ROL_ANALISTA))
    reporte = cliente.get("/reportes?periodo=mes", headers=encabezado)
    assert reporte.status_code == 200, reporte.text
    assert reporte.json()["personas_mas_activas"] is None  # sin nombres ni correos
    assert reporte.json()["premium"]["pagos"] is None
    busqueda = cliente.get(f"/reportes/buscar?q={persona.marca}", headers=encabezado)
    assert busqueda.status_code == 200
    assert busqueda.json()["personas"] is None
    assert cliente.get(f"/reportes/personas/{persona.id}", headers=encabezado).status_code == 403


def test_el_administrador_necesita_dos_pasos(cliente, crear_cuenta, entrar):
    sin_dos_pasos = entrar(crear_cuenta(rol=ROL_ADMIN))
    assert cliente.get("/reportes", headers=sin_dos_pasos).status_code == 403

    admin = crear_cuenta(rol=ROL_ADMIN, dos_pasos=True)
    sin_codigo = cliente.post("/auth/login", json={"email": admin.email, "password": CLAVE})
    assert sin_codigo.status_code == 200
    assert sin_codigo.json()["requires_2fa"] is True
    assert sin_codigo.json()["access_token"] is None  # todavía no entrega el token
    codigo_malo = "000000" if pyotp.TOTP(admin.clave_dos_pasos).now() != "000000" else "111111"
    malo = cliente.post("/auth/login", json={"email": admin.email, "password": CLAVE, "code": codigo_malo})
    assert malo.status_code == 401


def test_el_administrador_ve_a_las_personas(cliente, crear_cuenta, entrar):
    persona = crear_cuenta()
    encabezado = entrar(crear_cuenta(rol=ROL_ADMIN, dos_pasos=True))
    reporte = cliente.get("/reportes?periodo=hoy", headers=encabezado)
    assert reporte.status_code == 200, reporte.text
    assert reporte.json()["personas_mas_activas"] is not None
    busqueda = cliente.get(f"/reportes/buscar?q={persona.marca}", headers=encabezado).json()
    assert persona.id in [encontrada["id"] for encontrada in busqueda["personas"]]
    ficha = cliente.get(f"/reportes/personas/{persona.id}", headers=encabezado)
    assert ficha.status_code == 200
    assert ficha.json()["email"] == persona.email
    assert cliente.get("/reportes/buscar?q=a", headers=encabezado).status_code == 422  # muy corto
