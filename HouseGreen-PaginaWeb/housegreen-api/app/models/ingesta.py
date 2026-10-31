from sqlalchemy import BigInteger, Column, Integer, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.database import Base


class IngestionRun(Base):
    # Paso 118: una fila por cada vez que se cargan los remates del sitio (a mano o automática).
    # Sirve para saber cuándo se actualizaron los datos por última vez y qué encontró cada carga.
    __tablename__ = "ingestion_runs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    origin = Column(String(20), nullable=False, default="manual")  # "manual" o "automatica"
    status = Column(String(20), nullable=False, default="en_curso")  # en_curso, completa, con_errores, fallida
    started_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    finished_at = Column(TIMESTAMP(timezone=True))
    listed = Column(Integer)  # remates leídos en los listados del sitio
    created = Column(Integer)  # remates nuevos
    updated = Column(Integer)  # remates con precio o fecha cambiados, o que volvieron al sitio
    fichas_read = Column(Integer)  # fichas leídas (nuevas y revisadas)
    withdrawn = Column(Integer)  # remates que el sitio quitó (quedan marcados como retirados)
    errors = Column(Integer)
    detail = Column(JSONB)  # el detalle: qué remates cambiaron y cuáles fallaron
    error_message = Column(Text)  # si la carga se cayó entera, el motivo