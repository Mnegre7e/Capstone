from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import UUID

from app.routers.properties import _armar_respuesta
from app.database import get_db
from app.models.favorite import SavedProperty
from app.models.property import Property
from app.models.user import User
from app.schemas.favorite import FavoriteCreate, FavoriteOut
from app.auth.dependencies import get_current_user
from app.auditoria import anotar

router = APIRouter(prefix="/favoritos", tags=["Favoritos"])

# Paso 103: quitar un favorito ya no borra la fila: queda con la fecha en que se quitó (removed_at).
# Para la persona desaparece igual; en la base queda el registro. Las vigentes son las que tienen removed_at vacío.


@router.get("", response_model=list[FavoriteOut])
def listar_favoritos(db: Session = Depends(get_db), usuario: User = Depends(get_current_user)):
    favoritos = (
        db.query(SavedProperty)
        .filter(SavedProperty.user_id == usuario.id, SavedProperty.removed_at.is_(None))
        .all()
    )

    resultado = []
    for favorito in favoritos:
        propiedad_completa = _armar_respuesta(db, favorito.property)
        resultado.append(
            FavoriteOut(
                id=favorito.id,
                property_id=favorito.property_id,
                notes=favorito.notes,
                saved_at=favorito.saved_at,
                property=propiedad_completa,
            )
        )
    return resultado


@router.post("/{property_id}", response_model=FavoriteOut)
def agregar_favorito(
    property_id: UUID,
    datos: FavoriteCreate,
    request: Request,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_current_user),
):
    propiedad = db.query(Property).filter(Property.id == property_id).first()
    if not propiedad:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")

    favorito = (
        db.query(SavedProperty)
        .filter(SavedProperty.user_id == usuario.id, SavedProperty.property_id == property_id)
        .first()
    )
    if favorito and favorito.removed_at is None:
        raise HTTPException(status_code=400, detail="Esta propiedad ya está en tus favoritos")

    if favorito:
        # Paso 103: la había guardado y quitado antes: se vuelve a activar la misma fila
        favorito.removed_at = None
        favorito.saved_at = func.now()
        favorito.notes = datos.notes
    else:
        favorito = SavedProperty(user_id=usuario.id, property_id=property_id, notes=datos.notes)
        db.add(favorito)

    anotar(db, "favorito_agregado", request=request, usuario=usuario, entidad_tipo="propiedad", entidad_id=property_id)
    try:
        db.commit()
    except IntegrityError:
        # Dos clics muy seguidos: el segundo choca con el primero, que ya la guardó
        db.rollback()
        raise HTTPException(status_code=400, detail="Esta propiedad ya está en tus favoritos")

    db.refresh(favorito)

    propiedad_completa = _armar_respuesta(db, propiedad)
    return FavoriteOut(
        id=favorito.id,
        property_id=favorito.property_id,
        notes=favorito.notes,
        saved_at=favorito.saved_at,
        property=propiedad_completa,
    )


@router.delete("/{property_id}")
def quitar_favorito(
    property_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_current_user),
):
    favorito = (
        db.query(SavedProperty)
        .filter(
            SavedProperty.user_id == usuario.id,
            SavedProperty.property_id == property_id,
            SavedProperty.removed_at.is_(None),
        )
        .first()
    )
    if not favorito:
        raise HTTPException(status_code=404, detail="No tienes esta propiedad en favoritos")

    # Paso 103: no se borra; queda marcada con la fecha en que se quitó
    favorito.removed_at = func.now()
    anotar(db, "favorito_quitado", request=request, usuario=usuario, entidad_tipo="propiedad", entidad_id=property_id)
    db.commit()
    return {"mensaje": "Favorito quitado"}