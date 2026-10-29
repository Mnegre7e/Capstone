from sqlalchemy import BigInteger, Column, ForeignKey, SmallInteger, String, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


# Paso 117: códigos para recuperar la contraseña (tabla password_resets).
# El código de 6 dígitos nunca se guarda: solo su huella (code_hash).
class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    code_hash = Column(String(64), nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)  # vence 15 minutos después de pedirlo
    attempts = Column(SmallInteger, nullable=False, default=0)  # veces que se escribió mal
    used_at = Column(TIMESTAMP(timezone=True))  # vacío = todavía no se usa
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)