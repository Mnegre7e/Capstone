from datetime import datetime

from pydantic import BaseModel


class PlanOut(BaseModel):
    # Paso 122d: el plan Premium (GET /pagos/plan)
    precio: int  # pesos
    dias: int
    ambiente: str  # "integracion" (pruebas de Transbank, sin dinero real) o "produccion"


class PagoInicioOut(BaseModel):
    # Lo que la web necesita para mandar a la persona a la página de pago de Webpay
    pago_id: int
    url: str
    token: str


class PagoOut(BaseModel):
    # Un pago, como lo ve la persona que lo hizo (y, en el paso 122e, el administrador)
    id: int
    status: str  # pendiente, aprobado, rechazado, anulado o error
    amount: int
    days: int
    environment: str
    buy_order: str
    authorization_code: str | None = None
    payment_type_code: str | None = None
    card_last_digits: str | None = None
    premium_until: datetime | None = None  # hasta cuándo dio Premium este pago (si se aprobó)
    created_at: datetime
    finished_at: datetime | None = None

    class Config:
        from_attributes = True