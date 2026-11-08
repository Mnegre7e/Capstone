"""Paso 126: pruebas de las reglas de la API que NO necesitan la base de datos.
Paso 127: cada prueba dice si es funcional o no funcional (pytest -m funcional / pytest -m no_funcional)."""
from datetime import date, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pyotp
import pytest
from fastapi import HTTPException

from app.auth import two_factor
from app.auth.security import create_access_token, decode_access_token, hash_password, problema_de_contrasena, verify_password
from app.models.property import Property
from app.routers.reportes import _limites_del_periodo, categoria_de_tipo
from app.routers.reportes_buscador import _calza, _sin_tildes
from app.scraper.direcciones import calle_y_numero
from app.scraper.duplicados import datos_para_comparar, son_el_mismo_remate
from app.scraper.zona_precio import comparar, zona_del_descuento

CHILE = ZoneInfo("America/Santiago")


# ---------- Cuentas y contraseñas ----------

@pytest.mark.no_funcional
@pytest.mark.parametrize(
    "contrasena, sirve",
    [
        ("Corta1", False),  # menos de 8 caracteres
        ("SoloLetrasAqui", False),  # sin número
        ("1234567890", False),  # sin letra
        ("A1" * 33, False),  # más de 64 caracteres
        ("Remate2026", True),
    ],
    ids=["corta", "sin_numero", "sin_letra", "muy_larga", "valida"],
)
def test_reglas_de_la_contrasena(contrasena, sirve):
    assert (problema_de_contrasena(contrasena) is None) == sirve


@pytest.mark.no_funcional
def test_la_contrasena_se_guarda_cifrada():
    guardada = hash_password("Remate2026")
    assert guardada != "Remate2026"
    assert verify_password("Remate2026", guardada)
    assert not verify_password("remate2026", guardada)


@pytest.mark.no_funcional
def test_token_de_sesion():
    token = create_access_token({"sub": "123", "email": "persona@example.com"})
    assert decode_access_token(token)["sub"] == "123"
    assert decode_access_token(token + "x") is None  # un token alterado no sirve
    assert decode_access_token("cualquier cosa") is None


@pytest.mark.no_funcional
def test_codigo_de_dos_pasos():
    clave = pyotp.random_base32()
    assert two_factor.descifrar(two_factor.cifrar(clave)) == clave  # se guarda cifrada y se recupera igual
    codigo = pyotp.TOTP(clave).now()
    assert two_factor.codigo_correcto(clave, codigo)
    assert two_factor.codigo_correcto(clave, f"{codigo[:3]} {codigo[3:]}")  # como lo muestra la aplicación
    assert not two_factor.codigo_correcto(clave, "12345")
    assert not two_factor.codigo_correcto(clave, "abcdef")


# ---------- Reportes ----------

@pytest.mark.funcional
def test_periodos_de_los_reportes():
    jueves = datetime(2026, 11, 12, 15, 30, tzinfo=CHILE)
    inicio, fin, agrupado = _limites_del_periodo("hoy", jueves)
    assert (inicio.hour, fin, agrupado) == (0, jueves, "hora")
    inicio, _, agrupado = _limites_del_periodo("semana", jueves)
    assert (inicio.date(), agrupado) == (date(2026, 11, 9), "dia")  # desde el lunes
    inicio, _, agrupado = _limites_del_periodo("anio", jueves)
    assert (inicio.date(), agrupado) == (date(2026, 1, 1), "mes")
    _, fin, agrupado = _limites_del_periodo("rango", jueves, date(2026, 10, 1), date(2026, 10, 31))
    assert (fin.date(), agrupado) == (date(2026, 11, 1), "dia")  # el día de término se incluye entero


@pytest.mark.funcional
@pytest.mark.parametrize(
    "desde, hasta",
    [
        (date(2026, 10, 31), date(2026, 10, 1)),  # el inicio después del término
        (date(2020, 1, 1), date(2026, 11, 1)),  # más de 5 años
        (date(2026, 12, 1), date(2026, 12, 5)),  # empieza en el futuro
        (None, date(2026, 11, 1)),  # falta una fecha
    ],
    ids=["inicio_despues_del_termino", "mas_de_5_anios", "en_el_futuro", "falta_una_fecha"],
)
def test_rango_de_fechas_no_valido(desde, hasta):
    with pytest.raises(HTTPException) as error:
        _limites_del_periodo("rango", datetime(2026, 11, 12, 15, 30, tzinfo=CHILE), desde, hasta)
    assert error.value.status_code == 422


@pytest.mark.funcional
def test_categoria_del_tipo_de_propiedad():
    assert categoria_de_tipo("Parcela con casa") == "parcela"  # no "casa"
    assert categoria_de_tipo("Derechos sobre casa") == "derechos"
    assert categoria_de_tipo("Departamento") == "departamento"
    assert categoria_de_tipo("Sitio") == "terreno"
    assert categoria_de_tipo(None) == "otro"


@pytest.mark.funcional
def test_buscador_sin_tildes_ni_mayusculas():
    assert _sin_tildes("Ñuñoa") == "nunoa"
    assert _calza(_sin_tildes("casa ÑUÑOA").split(), "Casa en Ñuñoa", "Av. Grecia 1234")
    assert not _calza(["casa", "maipu"], "Casa en Ñuñoa")  # tienen que estar todas las palabras


# ---------- Semáforo del precio y carga de remates ----------

@pytest.mark.funcional
def test_zona_del_precio_frente_a_la_comuna():
    assert zona_del_descuento(Decimal("0.40")) == "verde"  # 40 % o más bajo el precio típico
    assert zona_del_descuento(Decimal("0.15")) == "amarillo"
    assert zona_del_descuento(Decimal("0.149")) == "rojo"
    assert not comparar("Parcela", 50_000_000, "Paine", None)["disponible"]  # solo casas y departamentos
    pocos_avisos = SimpleNamespace(sample_size=12, median_clp=100_000_000)
    assert not comparar("Casa", 50_000_000, "Paine", pocos_avisos)["disponible"]  # se piden al menos 20 avisos


@pytest.mark.funcional
def test_calle_y_numero_de_la_direccion():
    assert calle_y_numero("Avenida Grecia 1234, depto 501, Ñuñoa") == ("Avenida Grecia", "1234")
    assert calle_y_numero("Calle Los Diecisiete sin número") == ("Los Diecisiete", None)
    assert calle_y_numero("") is None


@pytest.mark.funcional
def test_remates_repetidos():
    dia = datetime(2026, 11, 20, 12, 0, tzinfo=CHILE)

    def remate(direccion, precio):
        return datos_para_comparar(Property(address=direccion, opening_price=precio, auction_date=dia), "Independencia")

    original = remate("Av. Independencia 733, depto 1007", 80_000_000)
    assert son_el_mismo_remate(original, remate("Avenida Independencia 733, depto 1007", 80_900_000))  # 1 % de diferencia
    assert not son_el_mismo_remate(original, remate("Av. Independencia 733, depto 1701", 80_000_000))  # otro depto
    assert not son_el_mismo_remate(original, remate("Av. Independencia 733, depto 1007", 90_000_000))  # otro precio
    otro_dia = datos_para_comparar(
        Property(address="Av. Independencia 733, depto 1007", opening_price=80_000_000, auction_date=dia + timedelta(days=1)),
        "Independencia",
    )
    assert not son_el_mismo_remate(original, otro_dia)
