from pydantic import BaseModel


# Paso 117: recuperar la contraseña

# 1) La persona escribe su correo para recibir el código
class PedirCodigo(BaseModel):
    email: str


# 2) Escribe el código que le llegó y su contraseña nueva
class CambiarConCodigo(BaseModel):
    email: str
    code: str  # 6 dígitos (puede venir con espacio: "123 456")
    new_password: str