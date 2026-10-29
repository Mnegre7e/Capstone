from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

# Paso 109: reportes del producto para el administrador y el analista.
# El analista ve solo totales; la lista de personas (nombre y correo) es solo para el administrador.


class UsuariosReporte(BaseModel):
    total: int  # inversionistas que se han registrado desde el inicio (las "descargas")
    activos: int  # de esos, los que hoy pueden entrar
    nuevos: int  # se registraron en el período
    por_plataforma: dict[str, int]  # registros del período: {"web": 3, "app": 0, "sin_dato": 1}
    eliminaron_su_cuenta: int  # eliminaron su cuenta en el período
    suspendidas: int  # cuentas suspendidas hoy por el administrador


class PublicacionesReporte(BaseModel):
    total: int  # publicaciones en la base
    nuevas: int  # subidas en el período
    vigentes: int  # remates que todavía no se realizan ni fueron retirados
    semaforo: dict[str, int]  # vigentes por nivel: {"verde": 11, "amarillo": 359, "rojo": 10, "sin_evaluar": 0}


class AlcanceReporte(BaseModel):
    vistas: int  # veces que inversionistas abrieron el detalle de una propiedad en el período
    personas_que_vieron: int  # inversionistas distintos que vieron al menos una
    guardados: int  # propiedades guardadas en el período (y que siguen guardadas)
    quitados: int  # favoritos que se quitaron en el período


class PublicacionReporte(BaseModel):
    id: UUID
    title: str
    comuna: str | None = None
    vistas: int  # en el período
    personas: int  # inversionistas distintos que la vieron en el período
    guardados: int  # la guardaron en el período


class ActividadReporte(BaseModel):
    inicios_de_sesion: dict[str, int]  # por tipo de cuenta: {"inversionista": 20, "analista": 2, "administrador": 5}
    personas_que_entraron: dict[str, int]  # personas distintas que iniciaron sesión, por tipo de cuenta
    opiniones: int
    calificacion_promedio: float | None = None  # de las opiniones del período (vacío si no hubo)
    alertas_creadas: int
    anuncios_enviados: int


class PuntoDeLaSerie(BaseModel):
    fecha: str  # "2026-10-24" si es por día, "2026-10" si es por mes
    registros: int
    publicaciones: int
    vistas: int
    guardados: int


# ---------- Paso 115: datos para las pantallas Subastas, Usuarios y Alcance ----------


class Cantidad(BaseModel):
    nombre: str  # una comuna, "Otras comunas" o "Todas las comunas"
    cantidad: int


class SubastasReporte(BaseModel):
    vigentes: int  # remates vigentes hoy (los mismos del catálogo)
    rematan_pronto: int  # de esos, los que se rematan en los próximos 7 días
    revisadas: int  # de esos, los que ya tienen zona de precio (el semáforo tiene más datos)
    por_comuna: list[Cantidad]  # las 8 comunas con más remates vigentes y "Otras comunas"
    por_tipo: dict[str, int]  # vigentes por tipo, tal como lo escribe el sitio: {"Casa": 140, "Sitio": 30}


class EmbudoReporte(BaseModel):
    # Desde el inicio, solo inversionistas con la cuenta activa
    activos: int
    vieron: int  # vieron al menos un remate
    guardaron: int  # tienen al menos un favorito
    con_alertas: int  # tienen al menos una alerta activa


class AvisoPorTipo(BaseModel):
    tipo: str  # nueva_propiedad, cambio_semaforo, cambio_precio o cambio_estado
    enviados: int
    leidos: int


class AvisosReporte(BaseModel):
    # Avisos automáticos que recibieron los inversionistas en el período (por sus alertas)
    enviados: int
    leidos: int
    por_tipo: list[AvisoPorTipo]


class UltimoAnuncio(BaseModel):
    titulo: str
    enviado_el: datetime
    destinatarios: int
    leidos: int


class PersonaActiva(BaseModel):
    # Solo la ve el administrador
    user_id: UUID
    full_name: str
    email: str
    vistas: int
    guardados: int


class Reporte(BaseModel):
    periodo: str  # "7d", "30d" o "12m"
    desde: datetime
    hasta: datetime
    agrupado_por: str  # "dia" o "mes" (cómo viene la serie)

    usuarios: UsuariosReporte
    publicaciones: PublicacionesReporte
    alcance: AlcanceReporte
    mas_vista: PublicacionReporte | None = None  # la favorita del público por vistas
    mas_guardada: PublicacionReporte | None = None  # la favorita del público por guardados
    ranking: list[PublicacionReporte]  # las 10 más vistas del período
    actividad: ActividadReporte
    serie: list[PuntoDeLaSerie]  # un punto por día (7 y 30 días) o por mes (12 meses)

    # Solo para el administrador (para el analista viene vacío: null)
    personas_mas_activas: list[PersonaActiva] | None = None

    # Paso 115
    subastas: SubastasReporte
    embudo: EmbudoReporte
    comunas_seguidas: list[Cantidad]  # comunas de las alertas activas (personas que siguen cada una)
    calificaciones: dict[str, int]  # opiniones del período por nota: {"1": 0, ..., "5": 3}
    avisos: AvisosReporte
    ultimo_anuncio: UltimoAnuncio | None = None  # el anuncio más reciente y cuántos lo leyeron
    inicios_por_plataforma: dict[str, int]  # inicios de sesión de inversionistas: {"web": 10, "app": 0, "sin_dato": 2}