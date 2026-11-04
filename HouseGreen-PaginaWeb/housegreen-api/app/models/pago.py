from sqlalchemy import BigInteger, Column, ForeignKey, Integer, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class Pago(Base):
    # Paso 122d: un intento de pago del plan Premium con Webpay (tabla payments).
    # HouseGreen nunca guarda la tarjeta: solo sus últimos 4 dígitos, que entrega Transbank.
    __tablename__ = "payments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    buy_order = Column(String(26), unique=True, nullable=False)  # número de orden enviado a Webpay
    session_id = Column(String(61), nullable=False)
    token = Column(String(64), unique=True)  # token de la transacción que entrega Webpay
    amount = Column(Integer, nullable=False)  # en pesos
    days = Column(Integer, nullable=False)  # días de Premium que compra
    status = Column(String(20), nullable=False, default="pendiente")  # pendiente, aprobado, rechazado, anulado, error
    environment = Column(String(12), nullable=False, default="integracion")  # integracion o produccion
    response_code = Column(Integer)  # 0 = aprobado
    authorization_code = Column(String(10))
    payment_type_code = Column(String(4))  # VD = débito, VN = crédito, VP = prepago...
    card_last_digits = Column(String(4))
    premium_from = Column(TIMESTAMP(timezone=True))  # desde y hasta cuándo dio Premium este pago
    premium_until = Column(TIMESTAMP(timezone=True))
    error_message = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    finished_at = Column(TIMESTAMP(timezone=True))