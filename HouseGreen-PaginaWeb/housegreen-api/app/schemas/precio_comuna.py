from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class PrecioComunaOut(BaseModel):
    # Paso 120b: el precio del remate comparado con el precio típico de su comuna (GET /propiedades/{id}/precio)
    disponible: bool  # False si no se puede comparar (ver "motivo")
    motivo: str | None = None
    tipo: str | None = None  # "departamento" o "casa"
    etiqueta: str | None = None  # como lo escribe la fuente: "Departamentos"
    comuna: str | None = None
    precio_minimo_clp: Decimal | None = None
    precio_tipico_clp: Decimal | None = None
    precio_tipico_uf: Decimal | None = None
    avisos: int | None = None  # cuántos avisos usó la fuente para el precio típico
    superficie_tipica_m2: Decimal | None = None
    descuento_pct: float | None = None  # 48.0 = 48 % bajo el precio típico; negativo = más caro
    zona: str | None = None  # verde, amarillo o rojo
    fuente: str | None = None
    fuente_url: str | None = None
    fecha: date | None = None  # fecha de actualización de la fuente