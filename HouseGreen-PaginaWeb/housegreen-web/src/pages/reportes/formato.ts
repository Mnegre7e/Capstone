// Paso 115: tipos y funciones que comparten las pantallas de Reportes
// (las usan el analista y el administrador). Los datos vienen de GET /reportes.

export type Periodo = "7d" | "30d" | "12m";

export interface PublicacionReporte {
  id: string;
  title: string;
  comuna: string | null;
  vistas: number;
  personas: number;
  guardados: number;
}

export interface PuntoDeLaSerie {
  fecha: string; // "2026-10-24" (por día) o "2026-10" (por mes)
  registros: number;
  publicaciones: number;
  vistas: number;
  guardados: number;
}

export interface Cantidad {
  nombre: string;
  cantidad: number;
}

// Lo que responde GET /reportes
export interface Reporte {
  periodo: Periodo;
  desde: string;
  hasta: string;
  agrupado_por: "dia" | "mes";
  usuarios: {
    total: number;
    activos: number;
    nuevos: number;
    por_plataforma: Record<string, number>; // web, app, sin_dato
    eliminaron_su_cuenta: number;
    suspendidas: number;
  };
  publicaciones: {
    total: number;
    nuevas: number;
    vigentes: number;
    semaforo: Record<string, number>; // verde, amarillo, rojo, sin_evaluar
  };
  alcance: { vistas: number; personas_que_vieron: number; guardados: number; quitados: number };
  mas_vista: PublicacionReporte | null;
  mas_guardada: PublicacionReporte | null;
  ranking: PublicacionReporte[];
  actividad: {
    inicios_de_sesion: Record<string, number>; // inversionista, analista, administrador
    personas_que_entraron: Record<string, number>;
    opiniones: number;
    calificacion_promedio: number | null;
    alertas_creadas: number;
    anuncios_enviados: number;
  };
  serie: PuntoDeLaSerie[];
  personas_mas_activas: { user_id: string; full_name: string; email: string; vistas: number; guardados: number }[] | null;
  // Paso 115
  subastas: {
    vigentes: number;
    rematan_pronto: number;
    revisadas: number;
    por_comuna: Cantidad[];
    por_tipo: Record<string, number>;
  };
  embudo: { activos: number; vieron: number; guardaron: number; con_alertas: number };
  comunas_seguidas: Cantidad[];
  calificaciones: Record<string, number>; // "1" a "5"
  avisos: { enviados: number; leidos: number; por_tipo: { tipo: string; enviados: number; leidos: number }[] };
  ultimo_anuncio: { titulo: string; enviado_el: string; destinatarios: number; leidos: number } | null;
  inicios_por_plataforma: Record<string, number>; // web, app, sin_dato
}

// Lo que el marco de Reportes le pasa a cada pantalla
export interface ContextoReportes {
  reporte: Reporte;
  esAdmin: boolean;
  textoPeriodo: string; // "los últimos 30 días"
}

export const PERIODOS: { valor: Periodo; nombre: string; texto: string }[] = [
  { valor: "7d", nombre: "7 días", texto: "los últimos 7 días" },
  { valor: "30d", nombre: "30 días", texto: "los últimos 30 días" },
  { valor: "12m", nombre: "12 meses", texto: "los últimos 12 meses" },
];

// Las partes de la barra del semáforo, de menor a mayor riesgo (como en el Panel)
export const NIVELES: { valor: string; nombre: string }[] = [
  { valor: "verde", nombre: "Riesgo bajo" },
  { valor: "amarillo", nombre: "Riesgo medio" },
  { valor: "rojo", nombre: "Riesgo alto" },
  { valor: "sin_evaluar", nombre: "Sin evaluar" },
];

export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

// 1234 -> "1.234"
export function numero(valor: number) {
  return valor.toLocaleString("es-CL");
}

export function plural(cantidad: number, singular: string, varios: string) {
  return `${numero(cantidad)} ${cantidad === 1 ? singular : varios}`;
}

export function porcentaje(parte: number, total: number) {
  return total === 0 ? "0 %" : `${Math.round((parte / total) * 100)} %`;
}

// "2026-10-24" -> "24 oct" y "2026-10" -> "oct 2026".
// Se arma a mano: new Date("2026-10-24") se lee en UTC y en Chile mostraría el día anterior.
export function nombreDeLaFecha(fecha: string, conAnio = false) {
  const [anio, mes, dia] = fecha.split("-");
  const nombreMes = MESES[Number(mes) - 1];
  if (!dia) return `${nombreMes} ${anio}`;
  return conAnio ? `${Number(dia)} ${nombreMes} ${anio}` : `${Number(dia)} ${nombreMes}`;
}

// Fecha y hora de la API ("2026-09-25T00:00:00-03:00") -> "25 sept 2026"
export function fechaCorta(fechaIso: string) {
  return new Date(fechaIso).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

// El tope del eje: un número "redondo" (1, 2, 5, 10, 20, 50...) igual o mayor que el máximo
export function topeRedondo(maximo: number) {
  if (maximo <= 1) return 1;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const paso of [1, 2, 5, 10]) {
    if (paso * potencia >= maximo) return paso * potencia;
  }
  return 10 * potencia;
}

// Avisos automáticos: cómo se llama cada tipo
export const NOMBRE_DEL_AVISO: Record<string, string> = {
  nueva_propiedad: "Remate nuevo que calza con su alerta",
  cambio_semaforo: "Cambió el semáforo",
  cambio_precio: "Cambió el precio",
  cambio_estado: "Cambió el estado del remate",
};

// Qué se puede ver en un gráfico de barras por día o por mes
export type Medida = "vistas" | "guardados" | "registros" | "publicaciones";
export const MEDIDAS: { valor: Medida; nombre: string; singular: string; plural: string }[] = [
  { valor: "vistas", nombre: "Vistas", singular: "vista", plural: "vistas" },
  { valor: "guardados", nombre: "Guardados", singular: "guardado", plural: "guardados" },
  { valor: "registros", nombre: "Registros", singular: "registro", plural: "registros" },
  { valor: "publicaciones", nombre: "Publicaciones", singular: "publicación", plural: "publicaciones" },
];