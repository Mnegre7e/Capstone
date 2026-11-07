from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.reportes import PuntoDeLaSerie

# Paso 123d: buscador de Reportes. Un remate lo pueden buscar el administrador y el analista;
# una persona (nombre y correo) solo el administrador.


# ---------- Lo que aparece mientras se escribe ----------
class RemateEncontrado(BaseModel):
    id: UUID
    title: str
    comuna: str | None = None
    codigo: str | None = None  # el número del remate en el sitio de origen
    estado: str  # "Vigente", "Finalizado", "Retirado" o "Quitado del catálogo"


class PersonaEncontrada(BaseModel):
    id: UUID
    full_name: str
    email: str
    estado: str  # "Activa", "Suspendida" o "Eliminó su cuenta"


class ResultadosBusqueda(BaseModel):
    remates: list[RemateEncontrado]
    personas: list[PersonaEncontrada] | None = None  # solo el administrador (para el analista viene null)


# ---------- Ficha de un remate en el período ----------
class PersonaDelRemate(BaseModel):
    # Solo la ve el administrador
    user_id: UUID
    full_name: str
    email: str
    vistas: int  # en el período
    la_tiene_guardada: bool  # hoy


class FichaRemate(BaseModel):
    periodo: str
    desde: datetime
    hasta: datetime
    agrupado_por: str  # "hora", "dia" o "mes"
    id: UUID
    title: str
    comuna: str | None = None
    tipo: str
    direccion: str | None = None
    codigo: str | None = None
    precio_minimo: int | None = None
    fecha_del_remate: datetime | None = None
    estado: str
    semaforo: str  # verde, amarillo, rojo o sin_evaluar (la última evaluación)
    vistas: int  # en el período
    personas: int  # inversionistas distintos que la vieron en el período
    guardados: int  # la guardaron en el período (y la siguen teniendo)
    quitados: int  # la quitaron de sus guardados en el período
    la_tienen_guardada: int  # hoy, desde siempre
    avisos: int  # avisos automáticos enviados por este remate en el período
    serie: list[PuntoDeLaSerie]  # vistas y guardados por hora, día o mes
    quienes: list[PersonaDelRemate] | None = None  # solo el administrador


# ---------- Ficha de una persona en el período (solo el administrador) ----------
class RemateDeLaPersona(BaseModel):
    id: UUID
    title: str
    comuna: str | None = None
    vistas: int  # en el período
    la_tiene_guardada: bool  # hoy


class FichaPersona(BaseModel):
    periodo: str
    desde: datetime
    hasta: datetime
    agrupado_por: str
    id: UUID
    full_name: str
    email: str
    estado: str
    registrada_el: datetime | None = None
    plataforma: str | None = None  # desde dónde se registró: web, app o null (sin dato)
    ultimo_inicio: datetime | None = None
    premium_hasta: datetime | None = None
    premium_vigente: bool = False  # tiene el plan hoy
    pagos: int  # pagos de Premium aprobados (desde siempre)
    pagado: int  # pesos
    inicios: int  # inicios de sesión en el período
    vistas: int
    remates_vistos: int  # remates distintos que vio en el período
    guardados: int
    quitados: int
    alertas_activas: int  # hoy
    opiniones: int  # en el período
    serie: list[PuntoDeLaSerie]  # vistas y guardados por hora, día o mes
    remates: list[RemateDeLaPersona]  # los que vio o guardó en el período (los más vistos primero)