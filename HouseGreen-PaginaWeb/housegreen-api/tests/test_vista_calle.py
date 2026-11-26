"""Pasos 135 a 135d: vista de calle, mapa e imagen fija de Google como foto principal de un remate.
No usan la base de datos ni llaman a Google (la búsqueda de fotos se reemplaza por una función de prueba)."""
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import pytest

from app.routers.vista_calle import (
    URL_IMAGEN_FIJA,
    URL_MAPA,
    URL_VISTA_CALLE,
    lugar_para_foto,
    rumbo,
    texto_para_google,
    url_imagen_fija,
    url_vista_calle,
    vista_de,
)

CLAVE = "clave-de-prueba"
SERVIDOR = "clave-del-servidor"
DIRECCION = "Unidad 48, calle Alicante 06048, condominio Alcázar, Colina"
TEXTO_COLINA = "Alicante 06048, Colina, Región Metropolitana, Chile"


def _ubicacion(accuracy="direccion", latitud=-33.4489, longitud=-70.6693):
    return SimpleNamespace(accuracy=accuracy, latitude=latitud, longitude=longitud)


def _datos(url):
    partes = urlsplit(url)
    return f"{partes.scheme}://{partes.netloc}{partes.path}", {k: v[0] for k, v in parse_qs(partes.query).items()}


def _sin_foto(lugar, clave):
    return None


def _foto_al_norte(lugar, clave):
    # La foto se tomó unos 11 m al norte del punto (-33.4489, -70.6693): para ver la casa hay que mirar al sur
    return {"pano": "PANO123", "lat": -33.4488, "lng": -70.6693}


# ---------- ficha: vista de calle o mapa ----------

@pytest.mark.funcional
def test_sin_clave_no_se_muestra():
    # Mientras el equipo no configure GOOGLE_MAPS_EMBED_KEY, la ficha muestra la foto de siempre
    respuesta = vista_de(_ubicacion(), "", DIRECCION, "Colina", SERVIDOR, _foto_al_norte)
    assert respuesta.disponible is False
    assert respuesta.url is None
    assert respuesta.motivo == "sin_clave"


@pytest.mark.funcional
def test_con_punto_exacto_mira_hacia_la_propiedad():
    # Paso 135d: la foto más cercana y la cámara mirando hacia la casa (al sur, 180°)
    respuesta = vista_de(_ubicacion(), CLAVE, DIRECCION, "Colina", SERVIDOR, _foto_al_norte)
    assert respuesta.tipo == "calle"
    base, datos = _datos(respuesta.url)
    assert base == URL_VISTA_CALLE
    assert datos["pano"] == "PANO123"
    assert datos["heading"] == "180"


@pytest.mark.funcional
@pytest.mark.parametrize("ubicacion", [_ubicacion(accuracy="calle"), _ubicacion(accuracy="comuna"), None])
def test_sin_numero_busca_la_foto_con_la_direccion_escrita(ubicacion):
    # Paso 135d: todos los remates con calle tienen vista de calle; sin el punto exacto no se fija hacia dónde mirar
    pedidos = []

    def buscar(lugar, clave):
        pedidos.append((lugar, clave))
        return _foto_al_norte(lugar, clave)

    respuesta = vista_de(ubicacion, CLAVE, DIRECCION, "Colina", SERVIDOR, buscar)
    assert pedidos == [(TEXTO_COLINA, SERVIDOR)]
    assert respuesta.tipo == "calle"
    _, datos = _datos(respuesta.url)
    assert datos["pano"] == "PANO123"
    assert "heading" not in datos


@pytest.mark.funcional
def test_sin_foto_cerca_y_sin_numero_muestra_el_mapa():
    respuesta = vista_de(_ubicacion(accuracy="comuna"), CLAVE, DIRECCION, "Colina", SERVIDOR, _sin_foto)
    assert respuesta.tipo == "mapa"
    base, datos = _datos(respuesta.url)
    assert base == URL_MAPA
    assert datos == {"key": CLAVE, "q": TEXTO_COLINA, "zoom": "17", "language": "es", "region": "CL"}


@pytest.mark.funcional
def test_sin_clave_del_servidor_funciona_como_el_paso_135c():
    # Sin GOOGLE_MAPS_SERVER_KEY no se busca la foto: punto exacto -> vista de calle; si no -> mapa
    def no_deberia_llamarse(lugar, clave):
        raise AssertionError("no debe buscar sin la clave del servidor")

    exacta = vista_de(_ubicacion(), CLAVE, DIRECCION, "Colina", "", no_deberia_llamarse)
    assert exacta.tipo == "calle" and _datos(exacta.url)[1]["location"] == "-33.448900,-70.669300"
    aproximada = vista_de(_ubicacion(accuracy="calle"), CLAVE, DIRECCION, "Colina", "", no_deberia_llamarse)
    assert aproximada.tipo == "mapa"


@pytest.mark.funcional
def test_sin_calle_el_mapa_se_aleja():
    _, datos = _datos(vista_de(None, CLAVE, None, "Pirque", SERVIDOR, _sin_foto).url)
    assert datos["zoom"] == "14"


# ---------- catálogo: imagen fija ----------

@pytest.mark.funcional
def test_imagen_fija_con_punto_exacto_usa_las_coordenadas():
    base, datos = _datos(url_imagen_fija(_ubicacion(), DIRECCION, "Colina", CLAVE))
    assert base == URL_IMAGEN_FIJA
    assert datos == {
        "size": "640x360",
        "location": "-33.448900,-70.669300",
        "fov": "80",
        "source": "outdoor",
        "return_error_code": "true",  # sin foto, la imagen falla y la tarjeta usa la de siempre
        "key": CLAVE,
        "radius": "60",
    }
    assert "heading" not in datos  # Google apunta la cámara a la dirección por sí solo


@pytest.mark.funcional
def test_imagen_fija_sin_numero_usa_la_direccion_escrita():
    _, datos = _datos(url_imagen_fija(_ubicacion(accuracy="comuna"), DIRECCION, "Colina", CLAVE))
    assert datos["location"] == TEXTO_COLINA
    assert "radius" not in datos


@pytest.mark.funcional
def test_imagen_fija_sin_calle_o_sin_clave_no_se_muestra():
    assert url_imagen_fija(None, "Parcela 12, sector Los Quillayes", "Pirque", CLAVE) is None
    assert url_imagen_fija(_ubicacion(), DIRECCION, "Colina", "") is None
    assert lugar_para_foto(None, None, "Pirque") is None


# ---------- piezas ----------

@pytest.mark.funcional
@pytest.mark.parametrize(
    "direccion, comuna, esperado",
    [
        (DIRECCION, "Colina", (TEXTO_COLINA, True)),  # el 0 se mantiene
        ("Avenida Calera de Tango s/n", "Calera de Tango",
         ("Avenida Calera de Tango, Calera de Tango, Región Metropolitana, Chile", True)),
        ("Parcela 12, sector Los Quillayes", "Pirque",
         ("Parcela 12, sector Los Quillayes, Pirque, Región Metropolitana, Chile", False)),
        (None, "Pirque", ("Pirque, Región Metropolitana, Chile", False)),
    ],
)
def test_texto_que_se_busca_en_google(direccion, comuna, esperado):
    assert texto_para_google(direccion, comuna) == esperado


@pytest.mark.funcional
@pytest.mark.parametrize(
    "hacia, grados",
    [((1.0, 0.0), 0), ((0.0, 1.0), 90), ((-1.0, 0.0), 180), ((0.0, -1.0), 270)],
)
def test_rumbo_hacia_cada_punto_cardinal(hacia, grados):
    assert round(rumbo(0.0, 0.0, *hacia)) % 360 == grados


@pytest.mark.funcional
def test_direccion_del_visor_de_la_vista_de_calle():
    base, datos = _datos(url_vista_calle(-33.44891234, -70.66934567, CLAVE))
    assert base == URL_VISTA_CALLE
    assert datos == {
        "key": CLAVE,
        "location": "-33.448912,-70.669346",  # 6 decimales
        "fov": "80",
        "language": "es",
        "region": "CL",
    }


@pytest.mark.funcional
def test_buscar_foto_lee_la_respuesta_de_google(monkeypatch):
    import app.routers.vista_calle as modulo

    respuestas = {
        "Calle A 1, Santiago": {"status": "OK", "pano_id": "P1", "location": {"lat": -33.1, "lng": -70.1}},
        "Calle B 2, Santiago": {"status": "ZERO_RESULTS"},
    }
    pedidos = []

    class Respuesta:
        def __init__(self, datos):
            self.datos = datos

        def json(self):
            return self.datos

    def get(url, params, timeout):
        pedidos.append(params["location"])
        assert url == modulo.URL_BUSCAR_FOTO and params["key"] == SERVIDOR and params["source"] == "outdoor"
        return Respuesta(respuestas[params["location"]])

    monkeypatch.setattr(modulo.requests, "get", get)
    monkeypatch.setattr(modulo, "_memoria", {})
    assert modulo.buscar_foto("Calle A 1, Santiago", SERVIDOR) == {"pano": "P1", "lat": -33.1, "lng": -70.1}
    assert modulo.buscar_foto("Calle B 2, Santiago", SERVIDOR) is None
    # La segunda vez se reutiliza lo que se encontró (solo en memoria): no se vuelve a preguntar a Google
    modulo.buscar_foto("Calle A 1, Santiago", SERVIDOR)
    modulo.buscar_foto("Calle B 2, Santiago", SERVIDOR)
    assert pedidos == ["Calle A 1, Santiago", "Calle B 2, Santiago"]


@pytest.mark.funcional
def test_buscar_foto_sin_respuesta_de_google_no_se_recuerda(monkeypatch):
    import app.routers.vista_calle as modulo

    llamadas = []

    def get(url, params, timeout):
        llamadas.append(1)
        raise modulo.requests.ConnectionError("sin internet")

    monkeypatch.setattr(modulo.requests, "get", get)
    monkeypatch.setattr(modulo, "_memoria", {})
    assert modulo.buscar_foto("Calle A 1, Santiago", SERVIDOR) is None
    assert modulo.buscar_foto("Calle A 1, Santiago", SERVIDOR) is None
    assert len(llamadas) == 2  # se reintenta la próxima vez
    assert modulo.buscar_foto("Calle A 1, Santiago", "") is None  # sin clave del servidor no se pregunta
