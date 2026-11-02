from datetime import datetime

from pydantic import BaseModel


class CargaResumen(BaseModel):
    # Paso 121: una carga de remates (tabla ingestion_runs), como la ve el administrador
    id: int
    origin: str  # "manual" o "automatica"
    status: str  # en_curso, completa, con_errores o fallida
    started_at: datetime
    finished_at: datetime | None = None
    minutos: float | None = None  # cuánto duró (None si sigue en curso)
    listed: int | None = None  # remates de la Región Metropolitana leídos en el sitio
    created: int | None = None  # nuevos
    updated: int | None = None  # con precio o fecha cambiados, o que volvieron al sitio
    fichas_read: int | None = None
    withdrawn: int | None = None  # retirados
    errors: int | None = None
    error_message: str | None = None  # si falló entera, el motivo


class CargaDetalle(CargaResumen):
    # Lo mismo, más el detalle que guardó la carga: qué remates entraron, cambiaron o se retiraron, los errores,
    # los precios por comuna (paso 120a) y las zonas de precio (paso 120b). Las cargas antiguas traen menos datos.
    detalle: dict = {}