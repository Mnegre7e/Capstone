import { Component, computed, inject, signal } from '@angular/core';

import { ApiService, mensajeDeError } from '../../core/api.service';
import { CatalogoService } from '../../core/catalogo.service';
import {
  CATEGORIAS,
  CategoriaTipo,
  Remate,
  Riesgo,
  categoriaDeTipo,
  pesos,
  remateFinalizado,
  remateRetirado,
} from '../../core/remates';
import { SesionService } from '../../core/sesion.service';
import {
  ColorDelPunto,
  ComunaDelMapa,
  ESCALA_COMUNAS,
  ModoDelMapa,
  PuntoDelMapa,
} from './mapa-remates.component';

// Paso A8: el mapa de los remates vigentes con el color de su semáforo, igual que la web (MapaPage).
// Antes era una imagen con puntos fijos. Es solo para Premium (y para el administrador). La ubicación de cada
// remate la busca la API en OpenStreetMap (GET /mapa). Con el mapa alejado se ven las comunas, con cuántos
// remates tiene cada una.

/** Lo que devuelve GET /mapa por cada remate. */
interface UbicacionApi {
  property_id: string;
  latitude: number;
  longitude: number;
  accuracy: 'direccion' | 'calle' | 'comuna';
}

/** El archivo con el borde de las 52 comunas de la Región Metropolitana (BCN, simplificado). */
interface ArchivoComunas {
  features: { properties: { nombre: string; etiqueta: [number, number] }; geometry: ComunaDelMapa['forma']['geometry'] }[];
}

/** Un punto del mapa con los remates que hay en él. */
interface Grupo {
  punto: PuntoDelMapa;
  lugar: string; // "San Miguel", o la comuna del edificio
  remates: { propiedad: Remate; exactitud: UbicacionApi['accuracy'] }[];
}

const NIVELES: { valor: Riesgo; nombre: string }[] = [
  { valor: 'verde', nombre: 'Riesgo bajo' },
  { valor: 'amarillo', nombre: 'Riesgo medio' },
  { valor: 'rojo', nombre: 'Riesgo alto' },
];

/** Qué tan exacto es el punto, para la tarjeta del remate. */
const TEXTO_EXACTITUD: Record<UbicacionApi['accuracy'], string | null> = {
  direccion: null,
  calle: 'Ubicado solo en su calle: OpenStreetMap no tiene el número, así que puede estar a unas cuadras.',
  comuna: 'Sin dirección en OpenStreetMap: se muestra en el centro de su comuna.',
};

/** "Estación Central" y "estacion central" son la misma comuna (sin tildes, espacios ni mayúsculas). */
function nombreComparable(nombre: string): string {
  return nombre.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[\s-]/g, '').toLowerCase();
}

/** Enlace a Google Maps con la dirección del remate (Google suele encontrar el número aunque OpenStreetMap no). */
function urlGoogleMaps(direccion: string, comuna: string | undefined): string {
  const comparable = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  let texto = comuna && !comparable(direccion).includes(comparable(comuna)) ? `${direccion}, ${comuna}` : direccion;
  if (!comparable(texto).trim().endsWith('chile')) texto += ', Chile';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}`;
}

/** Si no tiene evaluación se trata como riesgo medio (igual que en el catálogo). */
function nivelDe(propiedad: Remate): Riesgo {
  return propiedad.evaluation?.result_level ?? 'amarillo';
}

/** "jue 15 dic · 12:00" (las 00:00 significan que el sitio no informó la hora). */
function textoRemate(iso: string | null): string {
  if (!iso) return 'Fecha por confirmar';
  const fecha = new Date(iso);
  const dia = fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  if (fecha.getHours() === 0 && fecha.getMinutes() === 0) return dia;
  return `${dia} · ${fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

/** Cómo se llama un punto con varios remates ("en San Miguel", "en la misma calle", "en el mismo lugar"). */
function tituloDelGrupo(grupo: Grupo): string {
  if (grupo.punto.aproximado) return `en ${grupo.lugar} (centro de la comuna)`;
  if (grupo.punto.enSuCalle) return 'en la misma calle';
  return 'en el mismo lugar';
}

@Component({
  selector: 'app-mapa-propiedades',
  templateUrl: './mapa-propiedades.page.html',
  styleUrls: ['./mapa-propiedades.page.scss'],
  standalone: false,
})
export class MapaPropiedadesPage {
  private api = inject(ApiService);
  private catalogo = inject(CatalogoService);
  private sesion = inject(SesionService);

  readonly NIVELES = NIVELES;
  readonly CATEGORIAS = CATEGORIAS;
  readonly ESCALA_COMUNAS = ESCALA_COMUNAS;
  readonly conAcceso = computed(() => this.sesion.usuario()?.acceso_completo ?? false);

  private ubicaciones = signal<UbicacionApi[] | null>(null);
  readonly error = signal<string | null>(null);
  private archivoComunas = signal<ArchivoComunas | null>(null);
  readonly comuna = signal(''); // vacío = todas
  readonly tipo = signal<'' | CategoriaTipo>('');
  readonly nivel = signal<'' | Riesgo>('');
  readonly conAproximados = signal(true);
  readonly elegido = signal<string | null>(null);
  readonly modo = signal<ModoDelMapa>('puntos');
  readonly irA = signal<{ nombre: string; vez: number } | null>(null);

  // Los remates vigentes (no finalizados ni retirados) y la ubicación de cada uno
  private vigentes = computed(() =>
    this.catalogo.remates().filter((p) => !remateFinalizado(p.auction_date) && !remateRetirado(p.status)),
  );
  private ubicacionPorId = computed(() => new Map((this.ubicaciones() ?? []).map((u) => [u.property_id, u])));

  // Las comunas que tienen remates en el mapa, para el filtro
  readonly comunas = computed(() => {
    const cantidades = new Map<number, number>();
    for (const p of this.vigentes()) {
      if (this.ubicacionPorId().has(p.id)) cantidades.set(p.comuna_id, (cantidades.get(p.comuna_id) ?? 0) + 1);
    }
    return [...cantidades.entries()]
      .map(([id, cantidad]) => ({ id, nombre: this.catalogo.comunasPorId()[id] ?? 'Sin comuna', cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  });

  private filtrados = computed(() =>
    this.vigentes().filter(
      (p) =>
        (this.comuna() === '' || String(p.comuna_id) === this.comuna()) &&
        (this.tipo() === '' || categoriaDeTipo(p.property_type) === this.tipo()) &&
        (this.nivel() === '' || nivelDe(p) === this.nivel()),
    ),
  );

  // Los puntos del mapa. Los remates en el mismo lugar (varios departamentos de un edificio) van en un solo punto;
  // los de ubicación aproximada van todos juntos en el centro de su comuna.
  private grupos = computed(() => {
    const porClave = new Map<string, Grupo>();
    for (const propiedad of this.filtrados()) {
      const ubicacion = this.ubicacionPorId().get(propiedad.id);
      if (!ubicacion) continue;
      const aproximado = ubicacion.accuracy === 'comuna';
      if (aproximado && !this.conAproximados()) continue;
      const clave = aproximado
        ? `comuna-${propiedad.comuna_id}`
        : `${ubicacion.latitude.toFixed(5)},${ubicacion.longitude.toFixed(5)}`;
      let grupo = porClave.get(clave);
      if (!grupo) {
        grupo = {
          lugar: this.catalogo.comunasPorId()[propiedad.comuna_id] ?? 'Sin comuna',
          remates: [],
          punto: {
            clave,
            latitud: ubicacion.latitude,
            longitud: ubicacion.longitude,
            color: nivelDe(propiedad),
            aproximado,
            enSuCalle: ubicacion.accuracy === 'calle',
            cantidad: 0,
            nombre: '',
          },
        };
        porClave.set(clave, grupo);
      }
      grupo.remates.push({ propiedad, exactitud: ubicacion.accuracy });
    }
    // El color, el número y el nombre de cada punto
    for (const grupo of porClave.values()) {
      const colores = new Set(grupo.remates.map((r) => nivelDe(r.propiedad)));
      grupo.punto.color = colores.size === 1 ? ([...colores][0] as ColorDelPunto) : 'varios';
      grupo.punto.cantidad = grupo.remates.length;
      grupo.punto.enSuCalle = grupo.remates.every((r) => r.exactitud === 'calle');
      grupo.punto.nombre =
        grupo.remates.length === 1
          ? `${grupo.remates[0].propiedad.title}, ${NIVELES.find((n) => n.valor === nivelDe(grupo.remates[0].propiedad))?.nombre}` +
            (grupo.punto.enSuCalle ? ' (ubicado solo en su calle)' : '')
          : `${grupo.remates.length} remates ${tituloDelGrupo(grupo)}`;
      grupo.remates.sort((a, b) => (a.propiedad.auction_date ?? '9').localeCompare(b.propiedad.auction_date ?? '9'));
    }
    return [...porClave.values()];
  });

  readonly puntos = computed(() => this.grupos().map((g) => g.punto));

  // Cada comuna con cuántos remates tiene (con los filtros elegidos) y dónde están
  readonly comunasDelMapa = computed<ComunaDelMapa[]>(() => {
    const archivo = this.archivoComunas();
    if (!archivo) return [];
    const porNombre = new Map<string, { cantidad: number; limites: [number, number][] }>();
    for (const propiedad of this.filtrados()) {
      const nombre = nombreComparable(this.catalogo.comunasPorId()[propiedad.comuna_id] ?? '');
      const datos = porNombre.get(nombre) ?? { cantidad: 0, limites: [] };
      datos.cantidad += 1;
      const ubicacion = this.ubicacionPorId().get(propiedad.id);
      if (ubicacion && ubicacion.accuracy !== 'comuna') datos.limites.push([ubicacion.latitude, ubicacion.longitude]);
      porNombre.set(nombre, datos);
    }
    return archivo.features.map((f) => {
      const datos = porNombre.get(nombreComparable(f.properties.nombre));
      return {
        nombre: f.properties.nombre,
        forma: { type: 'Feature', properties: {}, geometry: f.geometry },
        etiqueta: f.properties.etiqueta,
        cantidad: datos?.cantidad ?? 0,
        limitesRemates: datos?.limites ?? [],
      };
    });
  });
  readonly comunasConRemates = computed(() =>
    this.comunasDelMapa()
      .filter((c) => c.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es')),
  );

  // El punto elegido, listo para mostrar en el panel
  readonly grupoElegido = computed(() => {
    const grupo = this.grupos().find((g) => g.punto.clave === this.elegido());
    if (!grupo) return null;
    const varios = grupo.remates.length > 1;
    return {
      titulo: varios ? `${grupo.remates.length} remates ${tituloDelGrupo(grupo)}` : grupo.lugar,
      notaAproximado: grupo.punto.aproximado && varios,
      notaCalle: grupo.punto.enSuCalle && varios,
      remates: grupo.remates.map(({ propiedad, exactitud }) => ({
        id: propiedad.id,
        titulo: propiedad.title,
        riesgo: nivelDe(propiedad),
        direccion: propiedad.address || 'Sin dirección informada',
        precio: pesos(Number(propiedad.opening_price)),
        fecha: textoRemate(propiedad.auction_date),
        nota: varios ? null : TEXTO_EXACTITUD[exactitud],
        google: propiedad.address
          ? urlGoogleMaps(propiedad.address, this.catalogo.comunasPorId()[propiedad.comuna_id])
          : null,
      })),
    };
  });

  // La línea de abajo de los filtros: cuántos remates hay en el mapa y qué tan exacta es su ubicación
  readonly cuenta = computed(() => {
    if (this.error()) return `No se pudo cargar el mapa: ${this.error()}`;
    if (this.catalogo.cargando() || this.ubicaciones() === null) return 'Cargando el mapa...';
    const enElMapa = this.grupos().reduce((suma, g) => suma + g.remates.length, 0);
    const porExactitud: Record<UbicacionApi['accuracy'], number> = { direccion: 0, calle: 0, comuna: 0 };
    this.grupos().forEach((g) => g.remates.forEach((r) => (porExactitud[r.exactitud] += 1)));
    const detalle = [
      porExactitud.direccion > 0 ? `${porExactitud.direccion.toLocaleString('es-CL')} en su dirección exacta` : '',
      porExactitud.calle > 0 ? `${porExactitud.calle.toLocaleString('es-CL')} solo en su calle` : '',
      porExactitud.comuna > 0 ? `${porExactitud.comuna.toLocaleString('es-CL')} en el centro de su comuna` : '',
    ].filter((texto) => texto !== '');
    const sinUbicar = this.filtrados().filter((p) => !this.ubicacionPorId().has(p.id)).length;
    return (
      `${enElMapa === 1 ? '1 remate' : `${enElMapa.toLocaleString('es-CL')} remates`} en el mapa` +
      (detalle.length > 0 ? `: ${detalle.join(' · ')}` : '') +
      (sinUbicar > 0 ? ` · ${sinUbicar} todavía sin ubicar (se agregan en la próxima carga diaria)` : '')
    );
  });

  ionViewWillEnter() {
    if (!this.conAcceso()) return;
    // Se vuelven a pedir en silencio (como el catálogo): así se ven los remates y semáforos más nuevos
    void this.catalogo.recargar();
    void this.cargarUbicaciones();
    // El borde de las comunas (si no carga, el mapa igual muestra los remates)
    if (!this.archivoComunas()) {
      fetch('assets/mapas/comunas-rm.json')
        .then((respuesta) => (respuesta.ok ? (respuesta.json() as Promise<ArchivoComunas>) : null))
        .then((datos) => this.archivoComunas.set(datos))
        .catch(() => this.archivoComunas.set(null));
    }
  }

  private async cargarUbicaciones() {
    try {
      this.ubicaciones.set(await this.api.get<UbicacionApi[]>('/mapa'));
      this.error.set(null);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  // Al cambiar un filtro se cierra el remate elegido
  filtrarComuna(valor: string) {
    this.comuna.set(valor);
    this.elegido.set(null);
  }

  filtrarTipo(valor: '' | CategoriaTipo) {
    this.tipo.set(valor);
    this.elegido.set(null);
  }

  filtrarNivel(valor: '' | Riesgo) {
    this.nivel.set(valor);
    this.elegido.set(null);
  }

  filtrarAproximados(valor: boolean) {
    this.conAproximados.set(valor);
    this.elegido.set(null);
  }

  irAComuna(nombre: string) {
    this.irA.set({ nombre, vez: Date.now() });
  }
}
