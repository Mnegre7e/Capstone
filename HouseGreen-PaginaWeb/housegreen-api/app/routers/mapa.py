# Paso 124a: los puntos del mapa de remates. El mapa es solo para Premium (y analista y administrador),
# igual que el detalle de cada remate. Las ubicaciones las busca app/scraper/ubicaciones.py en OpenStreetMap.
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import requerir_premium
from app.database import get_db
from app.models.property import Property
from app.models.ubicacion import PropiedadUbicacion
from app.schemas.mapa import PuntoMapa

router = APIRouter(prefix="/mapa", tags=["Mapa"])


@router.get("", response_model=list[PuntoMapa])
def puntos_del_mapa(db: Session = Depends(get_db), usuario=Depends(requerir_premium)):
    # La web los cruza con el catálogo (que ya trae el título, el precio y el semáforo de cada remate)
    filas = (
        db.query(
            PropiedadUbicacion.property_id,
            PropiedadUbicacion.latitude,
            PropiedadUbicacion.longitude,
            PropiedadUbicacion.accuracy,
        )
        .join(Property, Property.id == PropiedadUbicacion.property_id)
        .filter(Property.removed_at.is_(None), PropiedadUbicacion.latitude.isnot(None))
        .filter(Property.duplicate_of.is_(None))  # paso 124d: sin los remates repetidos
        .all()
    )
    return [
        PuntoMapa(property_id=fila.property_id, latitude=fila.latitude, longitude=fila.longitude, accuracy=fila.accuracy)
        for fila in filas
    ]