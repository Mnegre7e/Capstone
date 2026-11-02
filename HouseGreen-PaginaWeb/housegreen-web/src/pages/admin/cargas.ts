// Paso 121: tipos y funciones que comparten el Panel y el historial de cargas de remates

export type EstadoCarga = "en_curso" | "completa" | "con_errores" | "fallida";

// Lo que devuelve GET /admin/cargas (y "ultima_carga" en GET /admin/panel)
export interface CargaResumen {
  id: number;
  origin: "manual" | "automatica";
  status: EstadoCarga;
  started_at: string;
  finished_at: string | null;
  minutos: number | null;
  listed: number | null; // remates de la Región Metropolitana leídos en el sitio
  created: number | null;
  updated: number | null;
  fichas_read: number | null;
  withdrawn: number | null;
  errors: number | null;
  error_message: string | null;
}

// Si pasa más que esto sin una carga, el Panel lo avisa (la automática corre cada mañana)
export const HORAS_SIN_CARGA = 30;

export const NOMBRE_ESTADO: Record<EstadoCarga, string> = {
  en_curso: "En curso",
  completa: "Completa",
  con_errores: "Con errores",
  fallida: "Fallida",
};

export function textoOrigen(origen: CargaResumen["origin"]) {
  return origen === "automatica" ? "Automática" : "Manual";
}

// 0.3 -> "menos de 1 min" · 4 -> "4 min" · 84 -> "1 h 24 min"
export function textoDuracion(minutos: number | null) {
  if (minutos === null) return "sin terminar";
  const redondeado = Math.round(minutos);
  if (redondeado < 1) return "menos de 1 min";
  if (redondeado < 60) return `${redondeado} min`;
  const horas = Math.floor(redondeado / 60);
  const resto = redondeado % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

function mismoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "Hoy 06:17", "Ayer 19:40" o "sáb 31 oct · 06:17"
export function textoCuando(iso: string) {
  const fecha = new Date(iso);
  const hora = fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
  const hoy = new Date();
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (mismoDia(fecha, hoy)) return `Hoy ${hora}`;
  if (mismoDia(fecha, ayer)) return `Ayer ${hora}`;
  // toLocaleDateString entrega "sáb, 31 oct": se quita la coma, como en el resto del admin
  const dia = fecha.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
  return `${dia} · ${hora}`;
}

export function horasDesde(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

// "607 leídos · 3 nuevos · 2 actualizados · 1 retirado · 0 errores" (sin las cifras que no tiene)
export function textoCifras(carga: CargaResumen) {
  const partes: string[] = [];
  const agregar = (valor: number | null, uno: string, varios: string) => {
    if (valor !== null) partes.push(`${valor.toLocaleString("es-CL")} ${valor === 1 ? uno : varios}`);
  };
  agregar(carga.listed, "leído", "leídos");
  agregar(carga.created, "nuevo", "nuevos");
  agregar(carga.updated, "actualizado", "actualizados");
  agregar(carga.withdrawn, "retirado", "retirados");
  agregar(carga.errors, "error", "errores");
  return partes.join(" · ");
}