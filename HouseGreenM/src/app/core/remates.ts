// Paso A2: los remates tal como los entrega la API, y las mismas reglas que usa la web
// (formato de precios y fechas, remates finalizados o retirados y categorías de tipo).

export type Riesgo = 'verde' | 'amarillo' | 'rojo';

export interface Remate {
  id: string;
  title: string;
  address: string | null;
  comuna_id: number;
  property_type: string;
  opening_price: string; // la API lo manda como texto ("84940066.00")
  auction_date: string | null;
  status: string;
  image_url: string | null;
  created_at: string;
  physical_info: { bedrooms: number | null; bathrooms: number | null; surface_m2: string | null } | null;
  evaluation: { result_level: Riesgo } | null; // null sin Premium
}

export interface Comuna {
  id: number;
  name: string;
}

/** $84.940.066 */
export function pesos(valor: number): string {
  return valor.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

/** "Irarrázaval" -> "irarrazaval": así la búsqueda encuentra lo mismo con o sin tildes. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** "Remate jue 15 oct · 12:00" (las 00:00 significan "hora no informada": solo la fecha). */
export function textoRemate(iso: string): string {
  const fecha = new Date(iso);
  const dia = fecha.toLocaleDateString('es-CL', { weekday: 'short' });
  const diaMes = fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  if (fecha.getHours() === 0 && fecha.getMinutes() === 0) {
    return `Remate ${dia} ${diaMes}`;
  }
  const hora = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `Remate ${dia} ${diaMes} · ${hora}`;
}

/** "Publicado hoy", "Publicado ayer" o "Publicado el 28 sept 2026". */
export function textoPublicado(iso: string): string {
  const fecha = new Date(iso);
  const soloDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diasAtras = Math.round((soloDia(new Date()) - soloDia(fecha)) / 86_400_000);
  if (diasAtras === 0) {
    return 'Publicado hoy';
  }
  if (diasAtras === 1) {
    return 'Publicado ayer';
  }
  return `Publicado el ${fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** ¿El remate ya se realizó? Sin hora informada (00:00), se considera hecho al terminar ese día. */
export function remateFinalizado(fechaIso: string | null): boolean {
  if (!fechaIso) {
    return false;
  }
  const fecha = new Date(fechaIso);
  const ahora = new Date();
  if (fecha.getHours() === 0 && fecha.getMinutes() === 0) {
    return ahora >= new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
  }
  return ahora > fecha;
}

/** ¿El sitio de origen retiró el remate? */
export function remateRetirado(estado: string | null | undefined): boolean {
  return estado === 'retirada';
}

// Los más de 20 nombres de tipo del sitio de remates, agrupados en 8 categorías (igual que la web)
export type CategoriaTipo = 'departamento' | 'casa' | 'terreno' | 'parcela' | 'comercial' | 'bodega' | 'derechos' | 'otro';

export function categoriaDeTipo(tipo: string): CategoriaTipo {
  const texto = tipo.toLowerCase();
  const contiene = (palabras: string[]) => palabras.some((palabra) => texto.includes(palabra));
  // El orden importa: "parcela con casa" es parcela, no casa
  if (contiene(['derecho', 'usufructo', 'nuda propiedad'])) return 'derechos';
  if (contiene(['parcela', 'predio', 'fundo', 'hijuela', 'agrícola', 'agricola'])) return 'parcela';
  if (contiene(['casa', 'vivienda'])) return 'casa';
  if (contiene(['departamento'])) return 'departamento';
  if (contiene(['oficina', 'local'])) return 'comercial';
  if (contiene(['bodega', 'estacionamiento'])) return 'bodega';
  if (contiene(['sitio', 'lote', 'terreno'])) return 'terreno';
  return 'otro';
}

export const CATEGORIAS: { valor: CategoriaTipo; nombre: string }[] = [
  { valor: 'departamento', nombre: 'Departamentos' },
  { valor: 'casa', nombre: 'Casas' },
  { valor: 'terreno', nombre: 'Terrenos y sitios' },
  { valor: 'parcela', nombre: 'Parcelas y predios' },
  { valor: 'comercial', nombre: 'Oficinas y locales' },
  { valor: 'bodega', nombre: 'Bodegas y estacionamientos' },
  { valor: 'derechos', nombre: 'Derechos sobre una propiedad' },
  { valor: 'otro', nombre: 'Otros' },
];

export const NOMBRE_RIESGO: Record<Riesgo, string> = { verde: 'Riesgo bajo', amarillo: 'Riesgo medio', rojo: 'Riesgo alto' };

export const PRECIO_PREMIUM_TEXTO = '$9.990';
export const DIAS_PREMIUM = 30;
