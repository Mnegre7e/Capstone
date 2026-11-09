import { Component, inject, signal } from '@angular/core';

import {
  CargaResumen,
  NOMBRE_ESTADO_CARGA,
  textoCifras,
  textoCuando,
  textoDuracion,
  textoOrigen,
} from '../../core/admin';
import { ApiService, mensajeDeError } from '../../core/api.service';

// Paso A13: historial de las cargas de remates, igual que AdminCargasPage de la web (antes estaba solo en la web).
// Cada mañana GitHub ejecuta la carga automática y cada carga, automática o hecha a mano, queda anotada
// (GET /admin/cargas). "Ver detalle" pide lo que hizo esa carga (GET /admin/cargas/{id}).

// El detalle que guarda cada carga. Las cargas antiguas traen menos datos.
interface Detalle {
  en_el_sitio?: number;
  nuevos?: string[];
  actualizados?: string[];
  retirados?: string[];
  fuera_del_listado?: string[];
  fichas_nuevas?: number;
  fichas_revisadas?: number;
  errores?: string[];
  precios_por_comuna?: {
    omitida?: string | null;
    comunas_leidas?: number;
    con_precios?: number;
    sin_tabla?: string[];
    sin_pagina?: string[];
  };
  zona_de_precio?: { cambiados?: number; verde?: number; amarillo?: number; rojo?: number; sin_referencia?: number };
  mapa?: { ubicados?: number; direccion?: number; calle?: number; comuna?: number; sin_ubicacion?: number; quedan?: number };
  repetidos?: { grupos?: number; escondidos?: number; cambios?: string[] };
  omitidos?: { sin_comuna?: string[]; sin_precio?: string[]; tipo_desconocido?: string[] };
}

/** Un bloque del detalle: un título, unos párrafos y, si tiene, una lista de remates. */
interface Bloque {
  titulo: string;
  parrafos: string[];
  remates: string[];
  nota: string | null;
}

/** Lo que se muestra al abrir el detalle: los bloques, o un aviso si la carga no hizo nada. */
type VistaDetalle = { aviso: string } | { bloques: Bloque[] };
type EstadoDetalle = VistaDetalle | 'cargando' | 'error';

function numero(valor: number | undefined | null): string {
  return (valor ?? 0).toLocaleString('es-CL');
}

// Cuántos hubo en una lista: el número de la carga, o el largo de la lista si es mayor
function cuantos(elementos?: string[], total?: number | null): number {
  return Math.max(total ?? 0, elementos?.length ?? 0);
}

// Una lista de remates del detalle. "total" es cuántos hubo: la carga guarda como máximo 200 por lista.
function lista(titulo: string, elementos?: string[], total?: number | null): Bloque | null {
  const remates = elementos ?? [];
  const cantidad = cuantos(elementos, total);
  if (cantidad === 0) return null;
  let nota: string | null = null;
  if (cantidad > remates.length) {
    nota = remates.length === 0 ? 'Esta carga no guardó la lista.' : `Se guardaron solo los primeros ${numero(remates.length)}.`;
  }
  return { titulo: `${titulo} · ${numero(cantidad)}`, parrafos: [], remates, nota };
}

function bloque(titulo: string, parrafos: string[], remates: string[] = []): Bloque {
  return { titulo, parrafos, remates, nota: null };
}

// Lo mismo que DetalleCarga de la web, armado como una lista de bloques
function armarDetalle(carga: CargaResumen, detalle: Detalle): VistaDetalle {
  const precios = detalle.precios_por_comuna;
  const zonas = detalle.zona_de_precio;
  const omitidos = detalle.omitidos ?? {};
  const fichas = (detalle.fichas_nuevas ?? 0) + (detalle.fichas_revisadas ?? 0);

  // Solo se muestra lo que la carga alcanzó a hacer: una carga que falló al principio guarda todo en cero
  const hayDelSitio = (detalle.en_el_sitio ?? 0) > 0 || fichas > 0;
  const hayPrecios =
    precios !== undefined &&
    (Boolean(precios.omitida) ||
      (precios.comunas_leidas ?? 0) > 0 ||
      (precios.sin_tabla?.length ?? 0) > 0 ||
      (precios.sin_pagina?.length ?? 0) > 0);
  const hayZonas =
    zonas !== undefined &&
    (zonas.cambiados ?? 0) + (zonas.verde ?? 0) + (zonas.amarillo ?? 0) + (zonas.rojo ?? 0) + (zonas.sin_referencia ?? 0) > 0;
  const mapa = detalle.mapa;
  const hayMapa = mapa !== undefined && (mapa.ubicados ?? 0) + (mapa.quedan ?? 0) > 0;
  const repetidos = detalle.repetidos;
  const hayRepetidos = repetidos !== undefined && ((repetidos.grupos ?? 0) > 0 || (repetidos.cambios?.length ?? 0) > 0);

  const bloques: (Bloque | null)[] = [];
  if (hayDelSitio) {
    const parrafos: string[] = [];
    if ((detalle.en_el_sitio ?? 0) > 0) {
      parrafos.push(
        `Ese día el sitio publicaba ${numero(detalle.en_el_sitio)} remates en todo Chile; ${numero(carga.listed)} eran de la Región Metropolitana.`,
      );
    }
    if (fichas > 0) {
      parrafos.push(`Fichas leídas: ${numero(detalle.fichas_nuevas)} nuevas y ${numero(detalle.fichas_revisadas)} revisadas.`);
    }
    bloques.push(bloque('Del sitio', parrafos));
  }
  bloques.push(lista('Nuevos', detalle.nuevos, carga.created));
  bloques.push(lista('Actualizados', detalle.actualizados, carga.updated));
  bloques.push(lista('Retirados', detalle.retirados, carga.withdrawn));
  bloques.push(lista('Ya no están en el listado del sitio, pero su ficha sigue publicada', detalle.fuera_del_listado));
  bloques.push(lista('Errores', detalle.errores, carga.errors));
  if (hayRepetidos && repetidos) {
    bloques.push(
      bloque(
        'Remates repetidos',
        [
          `${numero(repetidos.grupos)} remates están publicados más de una vez en el sitio: se muestra uno de cada uno y quedan escondidos ${numero(repetidos.escondidos)} repetidos.`,
        ],
        repetidos.cambios ?? [],
      ),
    );
  }
  if (hayPrecios && precios) {
    const parrafos = [
      precios.omitida
        ? `No tocaba actualizarlos: ${precios.omitida}`
        : `Se leyeron ${numero(precios.comunas_leidas)} comunas; ${numero(precios.con_precios)} tienen precios.`,
    ];
    if ((precios.sin_tabla?.length ?? 0) > 0) parrafos.push(`Sin tabla de precios: ${precios.sin_tabla?.join(', ')}.`);
    if ((precios.sin_pagina?.length ?? 0) > 0) parrafos.push(`Sin página: ${precios.sin_pagina?.join(', ')}.`);
    bloques.push(bloque('Precios por comuna (PropiedadesYa)', parrafos));
  }
  if (hayZonas && zonas) {
    bloques.push(
      bloque('Zona de precio del semáforo', [
        `Cambiaron ${numero(zonas.cambiados)}. Quedaron: verde ${numero(zonas.verde)} · amarilla ${numero(zonas.amarillo)} · roja ${numero(zonas.rojo)} · sin referencia ${numero(zonas.sin_referencia)}.`,
      ]),
    );
  }
  if (hayMapa && mapa) {
    const sinUbicacion = (mapa.sin_ubicacion ?? 0) > 0 ? ` (${numero(mapa.sin_ubicacion)} sin ubicación)` : '';
    const parrafos = [
      `Se ubicaron ${numero(mapa.ubicados)}: ${numero(mapa.direccion)} con su dirección, ${numero(mapa.calle)} en su calle y ${numero(mapa.comuna)} en el centro de su comuna${sinUbicacion}.`,
    ];
    if ((mapa.quedan ?? 0) > 0) parrafos.push(`Quedan ${numero(mapa.quedan)} para la próxima carga.`);
    bloques.push(bloque('Mapa (OpenStreetMap)', parrafos));
  }
  bloques.push(lista('No se cargaron: comuna desconocida', omitidos.sin_comuna));
  bloques.push(lista('No se cargaron: sin precio', omitidos.sin_precio));
  bloques.push(lista('No se cargaron: tipo de remate desconocido', omitidos.tipo_desconocido));

  const conContenido = bloques.filter((b): b is Bloque => b !== null);
  if (conContenido.length === 0) {
    return {
      aviso:
        carga.status === 'fallida'
          ? 'Esta carga se detuvo antes de leer remates: no hay más detalle que el motivo.'
          : 'Esta carga no encontró cambios.',
    };
  }
  return { bloques: conContenido };
}

@Component({
  selector: 'app-cargas',
  templateUrl: './cargas.page.html',
  styleUrls: ['./cargas.page.scss'],
  standalone: false,
})
export class CargasPage {
  private api = inject(ApiService);

  readonly NOMBRE_ESTADO_CARGA = NOMBRE_ESTADO_CARGA;
  readonly textoCuando = textoCuando;
  readonly textoCifras = textoCifras;

  readonly cargas = signal<CargaResumen[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  // Detalles abiertos: { id de la carga: su detalle, "cargando" o "error" }
  readonly abiertos = signal<Record<number, EstadoDetalle>>({});

  async ionViewWillEnter() {
    try {
      this.cargas.set(await this.api.get<CargaResumen[]>('/admin/cargas'));
      this.error.set(null);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  meta(carga: CargaResumen): string {
    return `${textoOrigen(carga.origin)} · ${carga.status === 'en_curso' ? 'todavía corriendo' : textoDuracion(carga.minutos)}`;
  }

  // El detalle ya armado de una carga abierta (null si está cerrada, cargando o con error)
  vistaDe(id: number): VistaDetalle | null {
    const estado = this.abiertos()[id];
    return estado !== undefined && typeof estado === 'object' ? estado : null;
  }

  avisoDe(vista: VistaDetalle): string | null {
    return 'aviso' in vista ? vista.aviso : null;
  }

  bloquesDe(vista: VistaDetalle): Bloque[] {
    return 'bloques' in vista ? vista.bloques : [];
  }

  async alternarDetalle(carga: CargaResumen) {
    const id = carga.id;
    if (this.abiertos()[id] !== undefined) {
      // Ya estaba abierto: se cierra
      this.abiertos.update((actuales) => {
        const copia = { ...actuales };
        delete copia[id];
        return copia;
      });
      return;
    }
    this.abiertos.update((actuales) => ({ ...actuales, [id]: 'cargando' }));
    try {
      const respuesta = await this.api.get<{ detalle: Detalle | null }>(`/admin/cargas/${id}`);
      this.abiertos.update((actuales) => ({ ...actuales, [id]: armarDetalle(carga, respuesta.detalle ?? {}) }));
    } catch {
      this.abiertos.update((actuales) => ({ ...actuales, [id]: 'error' }));
    }
  }
}
