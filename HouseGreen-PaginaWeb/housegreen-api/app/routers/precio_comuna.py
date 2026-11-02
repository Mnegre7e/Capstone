from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.precio_comuna import ComunaMarketPrice
from app.models.property import Comuna, Property
from app.schemas.precio_comuna import PrecioComunaOut
from app.scraper.zona_precio import comparar, tipo_para_comparar

# Paso 120b: el detalle de la propiedad muestra con qué se comparó su precio (y por qué, si no se pudo)
router = APIRouter(prefix="/propiedades", tags=["Propiedades"])


@router.get("/{property_id}/precio", response_model=PrecioComunaOut)
def precio_frente_a_la_comuna(property_id: UUID, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    propiedad = db.query(Property).filter(Property.id == property_id).first()
    if not propiedad:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")

    comuna = db.get(Comuna, propiedad.comuna_id)
    tipo = tipo_para_comparar(propiedad.property_type)
    referencia = (
        db.query(ComunaMarketPrice).filter_by(comuna_id=propiedad.comuna_id, kind=tipo).first() if tipo else None
    )
    return PrecioComunaOut(**comparar(propiedad.property_type, propiedad.opening_price, comuna.name if comuna else None, referencia))