# Paso 122a: plan Premium.
# El catálogo lo ve cualquiera (incluso sin cuenta). El detalle de una propiedad, los favoritos y las alertas
# son para quienes tienen el plan Premium vigente. El analista y el administrador ven todo sin pagar.
# El plan dura hasta la fecha guardada en users.premium_until (la llena el pago, paso 122d).
from datetime import datetime, timezone

from sqlalchemy import func, or_

from app.models.user import User

# Analista (2) y administrador (3): trabajan en HouseGreen, no pagan
ROLES_SIN_PAGO = (2, 3)

MENSAJE_PREMIUM = "Esta información es solo para usuarios Premium."


def es_premium(usuario: User | None) -> bool:
    """True si la persona tiene el plan Premium vigente (pagado y sin vencer)."""
    return bool(usuario and usuario.premium_until and usuario.premium_until > datetime.now(timezone.utc))


def tiene_acceso_completo(usuario: User | None) -> bool:
    """True si puede ver el detalle de las propiedades: Premium vigente, o analista o administrador."""
    return usuario is not None and (usuario.role_id in ROLES_SIN_PAGO or es_premium(usuario))


def condicion_acceso_completo():
    """La misma regla, para usarla dentro de una consulta a la base (por ejemplo, a quién se le envían alertas)."""
    return or_(User.role_id.in_(ROLES_SIN_PAGO), User.premium_until > func.now())