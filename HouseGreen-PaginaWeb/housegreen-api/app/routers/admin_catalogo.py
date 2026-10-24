from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import requerir_admin
from app.auditoria import anotar
from app.models.property import Property
from app.models.user import User
from app.schemas.admin import QuitarPublicacionIn, EstadoPublicacionOut

# Paso 114: el administrador puede quitar una publicación del catálogo (por ejemplo, una de prueba).
# No se borra nada: queda con la fecha en que se quitó (removed_at), el motivo queda en el registro
# de actividad y se puede volver a publicar.
router = APIRouter(prefix="/admin", tags=["Admin"])


def _propiedad(db: Session, property_id: UUID) -> Property:
    propiedad = db.query(Property).filter(Property.id == property_id).first()
    if not propiedad:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    return propiedad


@router.post("/publicaciones/{property_id}/quitar", response_model=EstadoPublicacionOut)
def quitar_del_catalogo(
    property_id: UUID,
    datos: QuitarPublicacionIn,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(requerir_admin),
):
    propiedad = _propiedad(db, property_id)
    if propiedad.removed_at is not None:
        raise HTTPException(status_code=400, detail="Esta publicación ya está fuera del catálogo.")
    motivo = datos.motivo.strip()
    if len(motivo) < 3:
        raise HTTPException(status_code=400, detail="Escribe por qué la quitas del catálogo.")

    propiedad.removed_at = func.now()
    anotar(
        db,
        "publicacion_quitada",
        request=request,
        usuario=admin,
        entidad_tipo="propiedad",
        entidad_id=propiedad.id,
        despues={"motivo": motivo},
    )
    db.commit()
    db.refresh(propiedad)
    return EstadoPublicacionOut(removed_at=propiedad.removed_at)


@router.post("/publicaciones/{property_id}/volver-a-publicar", response_model=EstadoPublicacionOut)
def volver_a_publicar(
    property_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(requerir_admin),
):
    propiedad = _propiedad(db, property_id)
    if propiedad.removed_at is None:
        raise HTTPException(status_code=400, detail="Esta publicación ya está en el catálogo.")

    antes = {"quitada_el": propiedad.removed_at.isoformat()}
    propiedad.removed_at = None
    anotar(
        db,
        "publicacion_restaurada",
        request=request,
        usuario=admin,
        entidad_tipo="propiedad",
        entidad_id=propiedad.id,
        antes=antes,
    )
    db.commit()
    return EstadoPublicacionOut(removed_at=None)