# Registro de actividad: tabla audit_logs (creada en Neon en el paso 101, usada por la API desde el paso 102).
# Cada fila es una acción: quién, qué hizo, sobre qué y cuándo. La base no deja modificar ni borrar filas.
from sqlalchemy import JSON, TIMESTAMP, BigInteger, Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.database import Base

# En Neon las columnas old_value y new_value son JSONB; with_variant usa ese tipo en PostgreSQL
JSON_DE_LA_BASE = JSON().with_variant(JSONB(), "postgresql")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))  # vacío si no se sabe quién fue
    email = Column(String(255))
    role_id = Column(Integer, ForeignKey("roles.id"))
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(String(64))
    old_value = Column(JSON_DE_LA_BASE)
    new_value = Column(JSON_DE_LA_BASE)
    ip = Column(String(45))
    platform = Column(String(10))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)