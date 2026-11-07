from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class ComunaUbicacion(Base):
    # Paso 124a: centro y borde (rectángulo) de cada comuna, según OpenStreetMap.
    # El borde sirve para buscar las direcciones solo dentro de su comuna.
    __tablename__ = "comuna_locations"

    comuna_id = Column(Integer, ForeignKey("comunas.id", ondelete="CASCADE"), primary_key=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    south = Column(Float)
    north = Column(Float)
    west = Column(Float)
    east = Column(Float)
    geocoded_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


class PropiedadUbicacion(Base):
    # Paso 124a: dónde está cada remate en el mapa.
    # accuracy: "direccion" (calle y número), "calle" (sin el número), "comuna" (el centro de la comuna)
    # o "sin_ubicacion". address_used guarda la dirección que se buscó: si el remate cambia de dirección,
    # se vuelve a buscar.
    __tablename__ = "property_locations"

    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True)
    latitude = Column(Float)
    longitude = Column(Float)
    accuracy = Column(String(15), nullable=False)
    searched_text = Column(String(300))
    address_used = Column(Text)
    geocoded_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)