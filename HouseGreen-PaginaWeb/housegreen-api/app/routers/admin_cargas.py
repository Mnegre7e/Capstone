from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import requerir_admin
from app.database import get_db
from app.models.ingesta import IngestionRun
from app.schemas.cargas import CargaDetalle, CargaResumen

# Paso 121: historial de las cargas de remates (las automáticas de cada mañana y las hechas a mano).
# Solo lectura: las cargas las hace app/scraper/ingesta.py, que anota cada una en la tabla ingestion_runs.
router = APIRouter(prefix="/admin", tags=["Admin"])

CUANTAS_CARGAS = 60  # las últimas 60 (unos dos meses de cargas diarias)
# Igual que en ingesta.py: una carga que lleva más que esto "en curso" se cortó sin terminar
HORAS_PARA_DARLA_POR_CORTADA = 3


def resumen_de_carga(carga: IngestionRun) -> CargaResumen:
    estado = carga.status
    mensaje = carga.error_message
    # Si se cortó (se apagó el PC, GitHub la detuvo...) queda "en curso" hasta la próxima carga:
    # aquí ya se muestra como fallida, con la misma regla que usa ingesta.py
    limite = datetime.now(timezone.utc) - timedelta(hours=HORAS_PARA_DARLA_POR_CORTADA)
    if estado == "en_curso" and carga.started_at < limite:
        estado = "fallida"
        mensaje = mensaje or "Se cortó sin terminar."

    minutos = None
    if carga.finished_at:
        minutos = round((carga.finished_at - carga.started_at).total_seconds() / 60, 1)

    return CargaResumen(
        id=carga.id,
        origin=carga.origin,
        status=estado,
        started_at=carga.started_at,
        finished_at=carga.finished_at,
        minutos=minutos,
        listed=carga.listed,
        created=carga.created,
        updated=carga.updated,
        fichas_read=carga.fichas_read,
        withdrawn=carga.withdrawn,
        errors=carga.errors,
        error_message=mensaje,
    )


@router.get("/cargas", response_model=list[CargaResumen])
def historial_de_cargas(db: Session = Depends(get_db), usuario=Depends(requerir_admin)):
    cargas = db.query(IngestionRun).order_by(IngestionRun.started_at.desc()).limit(CUANTAS_CARGAS).all()
    return [resumen_de_carga(carga) for carga in cargas]


@router.get("/cargas/{carga_id}", response_model=CargaDetalle)
def detalle_de_carga(carga_id: int, db: Session = Depends(get_db), usuario=Depends(requerir_admin)):
    carga = db.get(IngestionRun, carga_id)
    if not carga:
        raise HTTPException(status_code=404, detail="Carga no encontrada")
    return CargaDetalle(**resumen_de_carga(carga).model_dump(), detalle=carga.detail or {})