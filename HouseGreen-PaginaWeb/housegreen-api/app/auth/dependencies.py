from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.auth.security import decode_access_token
from app.auth.two_factor import es_obligatoria_para
from app.auth.premium import MENSAJE_PREMIUM, tiene_acceso_completo

# Esto le dice a FastAPI (y a la página /docs) de dónde espera recibir el token:
# como un header "Authorization: Bearer <token>" en cada petición.
oauth2_scheme = HTTPBearer()
# Paso 122a: lo mismo, pero sin exigirlo (para lo que se puede ver sin cuenta, como el catálogo)
oauth2_opcional = HTTPBearer(auto_error=False)

# id del rol administrador en la tabla roles
ROL_ADMIN_ID = 3


def _usuario_del_token(token: str, db: Session) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar la sesión",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    usuario = db.query(User).filter(User.id == user_id).first()
    if usuario is None:
        raise credentials_exception

    # Una cuenta deshabilitada no puede seguir usando un token que obtuvo antes
    if not usuario.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Esta cuenta está deshabilitada")

    return usuario


def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    return _usuario_del_token(token.credentials, db)


def get_usuario_opcional(
    token: HTTPAuthorizationCredentials | None = Depends(oauth2_opcional),
    db: Session = Depends(get_db),
) -> User | None:
    # Paso 122a: sin token es un invitado (None). Con token, se valida igual que siempre.
    if token is None:
        return None
    return _usuario_del_token(token.credentials, db)


def requerir_premium(usuario: User = Depends(get_current_user)) -> User:
    # Paso 122a: el detalle, los favoritos y las alertas son para Premium (o analista y administrador).
    # Se responde 402 ("pago requerido") para que la web sepa que debe ofrecer el plan, y no pedir otra vez la sesión.
    if not tiene_acceso_completo(usuario):
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=MENSAJE_PREMIUM)
    return usuario


def requerir_admin(usuario: User = Depends(get_current_user)) -> User:
    if usuario.role_id != ROL_ADMIN_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta acción requiere permisos de administrador",
        )

    # Paso 80: el administrador está obligado a usar la verificación en dos pasos.
    # Mientras no la active puede entrar a su Perfil (para activarla), pero no administrar.
    if es_obligatoria_para(usuario.role_id) and not usuario.two_fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Las cuentas de administrador deben activar la verificación en dos pasos. Actívala en tu Perfil.",
        )

    return usuario