from uuid import UUID

from pydantic import BaseModel


# Paso 124a: un punto del mapa de remates (GET /mapa)
class PuntoMapa(BaseModel):
    property_id: UUID
    latitude: float
    longitude: float
    # direccion = calle y número · calle = la calle (sin el número) · comuna = el centro de la comuna (aproximada)
    accuracy: str