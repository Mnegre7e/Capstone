# Registro de actividad (paso 102): una sola función para anotar acciones en la tabla audit_logs.
# Regla: NUNCA se anotan contraseñas, tokens ni códigos de dos pasos.
from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User

# La web (y más adelante la app) avisa desde dónde viene cada petición con el encabezado X-Plataforma
PLATAFORMAS = {"web", "app"}


def anotar(
    db: Session,
    accion: str,
    *,
    request: Request | None = None,
    usuario: User | None = None,
    email: str | None = None,
    entidad_tipo: str | None = None,
    entidad_id=None,
    antes: dict | None = None,
    despues: dict | None = None,
) -> None:
    """Agrega una fila al registro. No guarda (commit): eso lo hace quien la llama,
    así la anotación y el cambio que describe se guardan juntos."""
    ip = None
    plataforma = None
    if request is not None:
        ip = request.client.host if request.client else None
        valor = (request.headers.get("X-Plataforma") or "").strip().lower()
        plataforma = valor if valor in PLATAFORMAS else None

    correo = email or (usuario.email if usuario else None)

    db.add(
        AuditLog(
            user_id=usuario.id if usuario else None,
            email=correo[:255] if correo else None,
            role_id=usuario.role_id if usuario else None,
            action=accion,
            entity_type=entidad_tipo,
            entity_id=str(entidad_id)[:64] if entidad_id is not None else None,
            old_value=antes,
            new_value=despues,
            ip=ip[:45] if ip else None,
            platform=plataforma,
        )
    )