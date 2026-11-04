# Paso 122e: el administrador ve los pagos del plan Premium.
# Es solo para mirar: el Premium lo da únicamente un pago aprobado por Webpay (no se da ni se quita a mano).
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import requerir_admin
from app.database import get_db
from app.models.pago import Pago
from app.models.user import User
from app.schemas.admin_pagos import PagoAdmin

router = APIRouter(prefix="/admin", tags=["Admin"])

# Webpay da 10 minutos para pagar. Si un pago sigue "pendiente" después de 15 minutos, ya no va a terminar:
# la persona cerró la página de Webpay o volvió atrás sin pagar. No se cobró nada ni se dio Premium.
MINUTOS_SIN_TERMINAR = 15
CUANTOS_PAGOS = 500  # los más recientes


def estado_del_pago(pago: Pago, ahora: datetime) -> str:
    if pago.status == "pendiente" and pago.created_at < ahora - timedelta(minutes=MINUTOS_SIN_TERMINAR):
        return "sin_terminar"
    return pago.status


@router.get("/pagos", response_model=list[PagoAdmin])
def listar_pagos(db: Session = Depends(get_db), admin: User = Depends(requerir_admin)):
    ahora = datetime.now(timezone.utc)
    filas = (
        db.query(Pago, User.full_name, User.email)
        .outerjoin(User, User.id == Pago.user_id)
        .order_by(Pago.created_at.desc(), Pago.id.desc())  # los más nuevos primero
        .limit(CUANTOS_PAGOS)
        .all()
    )
    return [
        PagoAdmin(
            id=pago.id,
            user_id=pago.user_id,
            full_name=nombre,
            email=correo,
            status=estado_del_pago(pago, ahora),
            amount=pago.amount,
            days=pago.days,
            environment=pago.environment,
            buy_order=pago.buy_order,
            authorization_code=pago.authorization_code,
            payment_type_code=pago.payment_type_code,
            card_last_digits=pago.card_last_digits,
            premium_until=pago.premium_until,
            error_message=pago.error_message,
            created_at=pago.created_at,
            finished_at=pago.finished_at,
        )
        for pago, nombre, correo in filas
    ]