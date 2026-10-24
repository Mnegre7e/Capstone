from datetime import datetime
from typing import Any

from pydantic import BaseModel

# Paso 111: registro de actividad (auditoría) para el administrador.


class RegistroAuditoria(BaseModel):
    id: int
    created_at: datetime
    email: str | None = None  # quién lo hizo (o el correo que se intentó usar, si no existe la cuenta)
    nombre: str | None = None  # su nombre, si tiene cuenta
    rol: str | None = None  # "inversionista", "analista", "administrador" o vacío (correo no registrado)
    accion: str  # por ejemplo "inicio_sesion" o "favorito_agregado"
    entidad_tipo: str | None = None  # "propiedad", "usuario", "anuncio", "opinion" o "alerta"
    entidad_id: str | None = None
    entidad_nombre: str | None = None  # el título de la propiedad, el correo de la persona, etc.
    antes: Any = None
    despues: Any = None
    ip: str | None = None
    plataforma: str | None = None  # "web" o "app"


class PaginaAuditoria(BaseModel):
    total: int  # cuántos registros calzan con los filtros
    registros: list[RegistroAuditoria]  # del más nuevo al más antiguo
    hay_mas: bool  # si quedan registros más antiguos por cargar