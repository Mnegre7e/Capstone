// Paso A10: tipos y funciones de las pantallas del analista, iguales a pages/reportes/formato.ts de la web.
// Los datos vienen de GET /reportes (los mismos que ve el analista en la página web).
// Paso A14: también las usa el administrador (sus Reportes traen además los datos de las personas).

// Hoy · Esta semana (desde el lunes) · Este mes · Este año · Rango (dos fechas)
export type Periodo = 'hoy' | 'semana' | 'mes' | 'anio' | 'rango';
// Cómo viene la serie del gráfico: una barra por hora (Hoy), por día o por mes
export type Agrupado = 'hora' | 'dia' | 'mes';
export type Nivel = 'verde' | 'amarillo' | 'rojo' | 'sin_evaluar';

export interface PublicacionReporte {
  id: string;
  title: string;
  comuna: string | null;
  vistas: number;
  personas: number;
  guardados: number;
}

export interface PuntoDeLaSerie {
  fecha: string; // "2026-10-24" (por día), "2026-10" (por mes) o "2026-10-24T14" (por hora)
  registros: number;
  publicaciones: number;
  vistas: number;
  guardados: number;
  suscripciones: number; // pagos de Premium aprobados
}

export interface Cantidad {
  nombre: string;
  cantidad: number;
}

// Lo que responde GET /reportes (al analista le llegan los totales, sin datos personales;
// lo que es null para el analista, al administrador le llega con las personas)
export interface Reporte {
  periodo: Periodo;
  desde: string;
  hasta: string;
  agrupado_por: Agrupado;
  filtros: { comuna_id: number | null; comuna: string | null; tipo: string | null; semaforo: string | null };
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
  personas_mas_activas: { user_id: string; full_name: string; email: string; vistas: number; guardados: number }[] | null;
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
  premium: {
    ambiente: 'integracion' | 'produccion';
    con_premium: number;
    suscripciones: number;
    nuevas: number;
    renovaciones: number;
    personas: number;
    ingresos: number;
    dejaron_de_pagar: number;
    pagos:
      | { pago_id: number; user_id: string; full_name: string; email: string; pagado_el: string; monto: number; nueva: boolean; hasta: string | null }[]
      | null;
    vencidos: { user_id: string; full_name: string; email: string; vencio_el: string; pagos: number }[] | null;
  };
}

// Lo que responde GET /reportes/remates/{id}: la ficha de un remate (se abre desde el buscador)
export interface FichaRemate {
  periodo: Periodo;
  desde: string;
  hasta: string;
  agrupado_por: Agrupado;
  id: string;
  title: string;
  comuna: string | null;
  tipo: string;
  direccion: string | null;
  codigo: string | null;
  precio_minimo: number | null;
  fecha_del_remate: string | null;
  estado: string;
  semaforo: string;
  vistas: number;
  personas: number;
  guardados: number;
  quitados: number;
  la_tienen_guardada: number;
  avisos: number;
  serie: PuntoDeLaSerie[];
  // Paso A14: quiénes la vieron o la guardaron (solo le llega al administrador; al analista, null)
  quienes: { user_id: string; full_name: string; email: string; vistas: number; la_tiene_guardada: boolean }[] | null;
}

// Paso A14: lo que responde GET /reportes/personas/{id}: la ficha de una persona (solo el administrador)
export interface FichaPersona {
  periodo: Periodo;
  desde: string;
  hasta: string;
  agrupado_por: Agrupado;
  id: string;
  full_name: string;
  email: string;
  estado: string;
  registrada_el: string | null;
  plataforma: string | null;
  ultimo_inicio: string | null;
  premium_hasta: string | null;
  premium_vigente: boolean;
  pagos: number;
  pagado: number;
  inicios: number;
  vistas: number;
  remates_vistos: number;
  guardados: number;
  quitados: number;
  alertas_activas: number;
  opiniones: number;
  serie: PuntoDeLaSerie[];
  remates: { id: string; title: string; comuna: string | null; vistas: number; la_tiene_guardada: boolean }[];
}

// Los botones de período. "texto" va después de "en" en las pantallas ("nuevas en esta semana").
export const PERIODOS: { valor: Periodo; nombre: string; texto: string }[] = [
  { valor: 'hoy', nombre: 'Hoy', texto: 'el día de hoy' },
  { valor: 'semana', nombre: 'Esta semana', texto: 'esta semana' },
  { valor: 'mes', nombre: 'Este mes', texto: 'este mes' },
  { valor: 'anio', nombre: 'Este año', texto: 'este año' },
  { valor: 'rango', nombre: 'Rango', texto: 'el período elegido' },
];

// El texto del período de un reporte o de una ficha ("este mes", "el período del 1 oct 2026 al 15 oct 2026")
export function textoDelPeriodo(datos: { periodo: Periodo; desde: string; hasta: string }): string {
  if (datos.periodo === 'rango') {
    return `el período del ${fechaCorta(datos.desde)} al ${fechaCorta(datos.hasta)}`;
  }
  return PERIODOS.find((p) => p.valor === datos.periodo)?.texto ?? 'el período elegido';
}

// Cómo se llama cada barra del gráfico
export const CADA: Record<Agrupado, { titulo: string; por: string; columna: string }> = {
  hora: { titulo: 'Hora a hora', por: 'por hora', columna: 'Hora' },
  dia: { titulo: 'Día a día', por: 'por día', columna: 'Día' },
  mes: { titulo: 'Mes a mes', por: 'por mes', columna: 'Mes' },
};

// Las partes de la barra del semáforo, de menor a mayor riesgo (como en el Panel)
export const NIVELES: { valor: Nivel; nombre: string }[] = [
  { valor: 'verde', nombre: 'Riesgo bajo' },
  { valor: 'amarillo', nombre: 'Riesgo medio' },
  { valor: 'rojo', nombre: 'Riesgo alto' },
  { valor: 'sin_evaluar', nombre: 'Sin evaluar' },
];

export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

// 1234 -> "1.234"
export function numero(valor: number): string {
  return valor.toLocaleString('es-CL');
}

// 9990 -> "$9.990"
export function pesos(valor: number): string {
  return valor.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

export function plural(cantidad: number, singular: string, varios: string): string {
  return `${numero(cantidad)} ${cantidad === 1 ? singular : varios}`;
}

export function porcentaje(parte: number, total: number): string {
  return total === 0 ? '0 %' : `${Math.round((parte / total) * 100)} %`;
}

// "2026-10-24" -> "24 oct", "2026-10" -> "oct 2026" y "2026-10-24T14" -> "14:00".
// Se arma a mano: new Date("2026-10-24") se lee en UTC y en Chile mostraría el día anterior.
export function nombreDeLaFecha(fecha: string, conAnio = false): string {
  const [elDia, hora] = fecha.split('T');
  const [anio, mes, dia] = elDia.split('-');
  const nombreMes = MESES[Number(mes) - 1];
  if (hora !== undefined) {
    return conAnio ? `${Number(dia)} ${nombreMes} ${anio}, ${hora}:00` : `${hora}:00`;
  }
  if (!dia) {
    return `${nombreMes} ${anio}`;
  }
  return conAnio ? `${Number(dia)} ${nombreMes} ${anio}` : `${Number(dia)} ${nombreMes}`;
}

// Fecha y hora de la API ("2026-09-25T00:00:00-03:00") -> "25 sept 2026"
export function fechaCorta(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

// La fecha de hoy en Chile, como la piden los campos de fecha: "2026-11-07"
export function hoyEnChile(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
}

// "2026-11-07" -> "7 nov 2026" (armado a mano: new Date("2026-11-07") se leería en UTC)
export function fechaDelCampo(valor: string): string {
  const [anio, mes, dia] = valor.split('-').map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

// El tope del eje: un número "redondo" (1, 2, 5, 10, 20, 50...) igual o mayor que el máximo
export function topeRedondo(maximo: number): number {
  if (maximo <= 1) {
    return 1;
  }
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const paso of [1, 2, 5, 10]) {
    if (paso * potencia >= maximo) {
      return paso * potencia;
    }
  }
  return 10 * potencia;
}

// Avisos automáticos: cómo se llama cada tipo
export const NOMBRE_DEL_AVISO: Record<string, string> = {
  nueva_propiedad: 'Remate nuevo que calza con su alerta',
  cambio_semaforo: 'Cambió el semáforo',
  cambio_precio: 'Cambió el precio',
  cambio_estado: 'Cambió el estado del remate',
};

// Qué se puede ver en un gráfico de barras por hora, por día o por mes
export type Medida = 'vistas' | 'guardados' | 'registros' | 'publicaciones' | 'suscripciones';
export const MEDIDAS: { valor: Medida; nombre: string; singular: string; plural: string }[] = [
  { valor: 'vistas', nombre: 'Vistas', singular: 'vista', plural: 'vistas' },
  { valor: 'guardados', nombre: 'Guardados', singular: 'guardado', plural: 'guardados' },
  { valor: 'registros', nombre: 'Registros', singular: 'registro', plural: 'registros' },
  { valor: 'publicaciones', nombre: 'Publicaciones', singular: 'publicación', plural: 'publicaciones' },
  { valor: 'suscripciones', nombre: 'Suscripciones', singular: 'suscripción', plural: 'suscripciones' },
];

// Una cifra grande de arriba de cada pantalla
export interface CifraReporte {
  titulo: string;
  valor: string;
  nota?: string;
}

// Una fila de las barras horizontales (comuna, tipo, paso del embudo...)
export interface FilaBarras {
  nombre: string;
  cantidad: number;
  nota?: string;
}
