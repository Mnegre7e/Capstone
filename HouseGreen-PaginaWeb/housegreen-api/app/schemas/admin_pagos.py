from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


# Paso 122e: un pago del plan Premium, como lo ve el administrador (GET /admin/pagos)
class PagoAdmin(BaseModel):
    id: int
    user_id: UUID
    full_name: str | None = None  # quién pagó
    email: str | None = None
    # aprobado, rechazado, anulado, error, pendiente (todavía en Webpay)
    # o sin_terminar (quedó pendiente hace más de 15 minutos: la persona salió de Webpay sin pagar)
    status: str
    amount: int  # pesos
    days: int  # días de Premium que compraba
    environment: str  # integracion (pago de prueba, sin dinero real) o produccion
    buy_order: str  # número de orden enviado a Webpay
    authorization_code: str | None = None
    payment_type_code: str | None = None  # VD = débito, VN = crédito, VP = prepago...
    card_last_digits: str | None = None  # solo los últimos 4 dígitos (HouseGreen nunca guarda la tarjeta)
    premium_until: datetime | None = None  # hasta cuándo dio Premium este pago (si se aprobó)
    error_message: str | None = None  # por qué no se aprobó, si Webpay lo informó
    created_at: datetime
    finished_at: datetime | None = None