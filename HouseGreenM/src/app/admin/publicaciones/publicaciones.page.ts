import { Component, computed, inject, signal } from '@angular/core';

import {
  EstadoPublicacion,
  PublicacionAdmin,
  Zona,
  estadoPublicacion,
  nombreComuna,
  plural,
  textoZona,
} from '../../core/admin';
import { ApiService, mensajeDeError } from '../../core/api.service';

// Paso A9: las publicaciones del administrador, igual que AdminPublicacionesPage de la web
// (antes tenía datos de ejemplo). GET /admin/publicaciones: cada remate con sus vistas y guardados.

type Orden = 'vistas' | 'guardadas' | 'comuna' | Zona;
type FiltroGuardados = 'todas' | 'con' | 'sin';
type FiltroEstado = EstadoPublicacion | 'todas';

const OPCIONES_ORDEN: { valor: Orden; texto: string }[] = [
  { valor: 'vistas', texto: 'Más vistas' },
  { valor: 'guardadas', texto: 'Más guardadas' },
  { valor: 'comuna', texto: 'Comuna (A–Z)' },
  { valor: 'verde', texto: 'Semáforo: verdes primero' },
  { valor: 'amarillo', texto: 'Semáforo: amarillos primero' },
  { valor: 'rojo', texto: 'Semáforo: rojos primero' },
];

const OPCIONES_GUARDADOS: { valor: FiltroGuardados; texto: string }[] = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'con', texto: 'Con guardados' },
  { valor: 'sin', texto: 'Sin guardados' },
];

const NOMBRE_DEL_ESTADO: Record<EstadoPublicacion, string> = {
  vigente: 'Vigente',
  finalizada: 'Ya se remató',
  retirada: 'Retirada',
  quitada: 'Quitada',
};

const OPCIONES_ESTADO: { valor: FiltroEstado; texto: string }[] = [
  { valor: 'vigente', texto: 'Vigentes' },
  { valor: 'finalizada', texto: 'Ya se remataron' },
  { valor: 'retirada', texto: 'Retiradas' },
  { valor: 'quitada', texto: 'Quitadas por el admin' },
  { valor: 'todas', texto: 'Todas' },
];

// Para ordenar por semáforo: el color elegido primero y las sin evaluar al final
const ORDEN_ZONAS: Record<Zona, (Zona | null)[]> = {
  verde: ['verde', 'amarillo', 'rojo', null],
  amarillo: ['amarillo', 'verde', 'rojo', null],
  rojo: ['rojo', 'amarillo', 'verde', null],
};

function comparar(orden: Orden, a: PublicacionAdmin, b: PublicacionAdmin): number {
  const porVistas = b.vistas - a.vistas || b.guardados - a.guardados;
  if (orden === 'vistas') return porVistas;
  if (orden === 'guardadas') return b.guardados - a.guardados || b.vistas - a.vistas;
  if (orden === 'comuna') return nombreComuna(a).localeCompare(nombreComuna(b), 'es') || porVistas;
  const zonas = ORDEN_ZONAS[orden];
  return zonas.indexOf(a.result_level) - zonas.indexOf(b.result_level) || porVistas;
}

@Component({
  selector: 'app-publicaciones',
  templateUrl: './publicaciones.page.html',
  styleUrls: ['./publicaciones.page.scss'],
  standalone: false,
})
export class PublicacionesPage {
  private api = inject(ApiService);

  readonly OPCIONES_ORDEN = OPCIONES_ORDEN;
  readonly OPCIONES_GUARDADOS = OPCIONES_GUARDADOS;
  readonly OPCIONES_ESTADO = OPCIONES_ESTADO;
  readonly plural = plural;

  readonly publicaciones = signal<PublicacionAdmin[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  private fotosQueFallaron = signal<Set<string>>(new Set());

  readonly panelAbierto = signal(false);
  readonly orden = signal<Orden>('vistas');
  readonly comunasElegidas = signal<string[]>([]); // vacío = todas
  readonly guardados = signal<FiltroGuardados>('todas');
  readonly estado = signal<FiltroEstado>('vigente');

  readonly comunas = computed(() =>
    [...new Set(this.publicaciones().map(nombreComuna))].sort((a, b) => a.localeCompare(b, 'es')),
  );

  // Cuántas hay en cada estado (para los botones del filtro y el subtítulo)
  readonly porEstado = computed(() => {
    const cuenta: Record<FiltroEstado, number> = {
      vigente: 0,
      finalizada: 0,
      retirada: 0,
      quitada: 0,
      todas: this.publicaciones().length,
    };
    for (const p of this.publicaciones()) cuenta[estadoPublicacion(p)]++;
    return cuenta;
  });

  readonly resultado = computed(() =>
    this.publicaciones()
      .filter((p) => this.estado() === 'todas' || estadoPublicacion(p) === this.estado())
      .filter((p) => this.comunasElegidas().length === 0 || this.comunasElegidas().includes(nombreComuna(p)))
      .filter((p) => this.guardados() === 'todas' || (this.guardados() === 'con' ? p.guardados > 0 : p.guardados === 0))
      .sort((a, b) => comparar(this.orden(), a, b))
      .map((p) => {
        const estado = estadoPublicacion(p);
        return {
          p,
          comuna: nombreComuna(p),
          zona: textoZona(p),
          estado: estado === 'vigente' ? null : { valor: estado, nombre: NOMBRE_DEL_ESTADO[estado] },
          foto: p.image_url && !this.fotosQueFallaron().has(p.id) ? this.api.urlDeArchivo(p.image_url) : null,
        };
      }),
  );

  readonly filtrosActivos = computed(
    () =>
      this.comunasElegidas().length + (this.guardados() !== 'todas' ? 1 : 0) + (this.estado() !== 'vigente' ? 1 : 0),
  );
  readonly textoOrden = computed(() => OPCIONES_ORDEN.find((o) => o.valor === this.orden())?.texto);

  async ionViewWillEnter() {
    // Se piden cada vez que se entra: así se ven los cambios hechos en el detalle o en la web
    try {
      this.publicaciones.set(await this.api.get<PublicacionAdmin[]>('/admin/publicaciones'));
      this.error.set(null);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  alternarComuna(comuna: string) {
    this.comunasElegidas.update((actuales) =>
      actuales.includes(comuna) ? actuales.filter((c) => c !== comuna) : [...actuales, comuna],
    );
  }

  fotoFallo(id: string) {
    this.fotosQueFallaron.update((ids) => new Set(ids).add(id));
  }

  limpiar() {
    this.orden.set('vistas');
    this.comunasElegidas.set([]);
    this.guardados.set('todas');
    this.estado.set('vigente');
  }
}
