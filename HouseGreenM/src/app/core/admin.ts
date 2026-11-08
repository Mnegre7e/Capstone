import { remateFinalizado, remateRetirado } from './remates';

// Paso A9: lo que comparten las pantallas del administrador (igual que pages/admin/publicacion.ts,
// cargas.ts y pagos.ts de la web).

export type Zona = 'verde' | 'amarillo' | 'rojo';
export type Dominio = 'exclusivo' | 'otro';

/** Lo que devuelve GET /admin/publicaciones por cada publicación. */
export interface PublicacionAdmin {
  id: string;
  title: string;
  comuna: string | null;
  property_type: string;
  status: string | null;
  image_url: string | null;
  result_level: Zona | null;
  total_points: number | null;
  vistas: number;
  personas: number;
  guardados: number;
  opening_price: string | null;
  auction_date: string | null;
  market_zone: Zona | null;
  domain_type: Dominio | null;
  address: string | null;
  removed_at: string | null; // cuándo el admin la quitó del catálogo (null = publicada)
}

const NOMBRE_ZONA: Record<Zona, string> = { verde: 'Verde', amarillo: 'Amarilla', rojo: 'Roja' };

export function nombreComuna(p: Pick<PublicacionAdmin, 'comuna'>): string {
  return p.comuna ?? 'Comuna desconocida';
}

/** "Verde · 7/8", "Roja · sin puntaje" o "Sin evaluar". */
export function textoZona(p: Pick<PublicacionAdmin, 'result_level' | 'total_points'>): string {
  if (!p.result_level) return 'Sin evaluar';
  const puntos = p.total_points === null ? 'sin puntaje' : `${p.total_points}/8`;
  return `${NOMBRE_ZONA[p.result_level]} · ${puntos}`;
}

/** "1 vista", "3 vistas". */
export function plural(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`;
}

export type EstadoPublicacion = 'vigente' | 'finalizada' | 'retirada' | 'quitada';

export function estadoPublicacion(
  p: Pick<PublicacionAdmin, 'status' | 'auction_date' | 'removed_at'>,
): EstadoPublicacion {
  if (p.removed_at) return 'quitada';
  if (remateRetirado(p.status)) return 'retirada';
  if (remateFinalizado(p.auction_date)) return 'finalizada';
  return 'vigente';
}

// ---------- La carga diaria de remates (panel) ----------
export type EstadoCarga = 'en_curso' | 'completa' | 'con_errores' | 'fallida';

export interface CargaResumen {
  id: number;
  origin: 'manual' | 'automatica';
  status: EstadoCarga;
  started_at: string;
  finished_at: string | null;
  minutos: number | null;
  listed: number | null;
  created: number | null;
  updated: number | null;
  fichas_read: number | null;
  withdrawn: number | null;
  errors: number | null;
  error_message: string | null;
}

/** Si pasan más horas que esto sin una carga, el panel avisa. */
export const HORAS_SIN_CARGA = 40;

export const NOMBRE_ESTADO_CARGA: Record<EstadoCarga, string> = {
  en_curso: 'En curso',
  completa: 'Completa',
  con_errores: 'Con errores',
  fallida: 'Fallida',
};

export function textoOrigen(origen: CargaResumen['origin']): string {
  return origen === 'automatica' ? 'Automática' : 'Manual';
}

export function textoDuracion(minutos: number | null): string {
  if (minutos === null) return 'sin terminar';
  const redondeado = Math.round(minutos);
  if (redondeado < 1) return 'menos de 1 min';
  if (redondeado < 60) return `${redondeado} min`;
  const horas = Math.floor(redondeado / 60);
  const resto = redondeado % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Hoy 06:10", "Ayer 06:10" o "lun 2 nov · 06:10". */
export function textoCuando(iso: string): string {
  const fecha = new Date(iso);
  const hora = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  const hoy = new Date();
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (mismoDia(fecha, hoy)) return `Hoy ${hora}`;
  if (mismoDia(fecha, ayer)) return `Ayer ${hora}`;
  const dia = fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
  return `${dia} · ${hora}`;
}

export function horasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

/** "120 leídos · 3 nuevos · 2 actualizados". */
export function textoCifras(carga: CargaResumen): string {
  const partes: string[] = [];
  const agregar = (valor: number | null, uno: string, varios: string) => {
    if (valor !== null) partes.push(`${valor.toLocaleString('es-CL')} ${valor === 1 ? uno : varios}`);
  };
  agregar(carga.listed, 'leído', 'leídos');
  agregar(carga.created, 'nuevo', 'nuevos');
  agregar(carga.updated, 'actualizado', 'actualizados');
  agregar(carga.withdrawn, 'retirado', 'retirados');
  agregar(carga.errors, 'error', 'errores');
  return partes.join(' · ');
}

/** 1234 -> "1.234" */
export function numero(valor: number): string {
  return valor.toLocaleString('es-CL');
}

/** Una foto de una publicación (la 0 es la portada). */
export interface FotoPublicacion {
  id: string;
  url: string;
  label: string | null;
  position: number;
}

/** "5 de noviembre de 2026" o "5 de noviembre de 2026, 12:00" (las 00:00 = hora no informada). */
export function fechaDelRemate(iso: string): string {
  const fecha = new Date(iso);
  const dia = fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  if (fecha.getHours() === 0 && fecha.getMinutes() === 0) return dia;
  return `${dia}, ${fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}
