from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

# Paso 85: lista de usuarios para el administrador.
# Los campos en inglés son columnas de la base; los en español se calculan (conteos).
class UsuarioAdmin(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: str | None = None
    role_name: str | None = None  # inversionista, analista o administrador
    is_active: bool  # False = cuenta suspendida o eliminada
    deleted_at: datetime | None = None  # paso 105: cuándo la eliminó su dueño (vacío = no la eliminó)
    two_fa_enabled: bool  # si tiene activada la verificación en dos pasos
    created_at: datetime | None = None  # cuándo se registró

    vistas: int = 0  # veces que abrió el detalle de una propiedad
    guardados: int = 0  # propiedades que tiene en favoritos
    opiniones: int = 0  # opiniones que ha enviado
    ultima_actividad: datetime | None = None  # última vista, guardado u opinión (vacío si no tiene)


# Paso 106: lo que responden "suspender" y "reactivar": cómo quedó la cuenta
class EstadoCuenta(BaseModel):
    id: UUID
    is_active: bool
    deleted_at: datetime | None = None