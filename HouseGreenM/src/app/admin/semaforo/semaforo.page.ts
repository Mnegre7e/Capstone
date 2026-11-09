import { Component, computed, inject, signal } from '@angular/core';

import {
  Dominio,
  PublicacionAdmin,
  Zona,
  estadoPublicacion,
  nombreComuna,
  plural,
  textoZona,
} from '../../core/admin';
import { ApiService, mensajeDeError } from '../../core/api.service';

// Paso A13: Semáforo del administrador, igual que AdminSemaforoPage de la web (antes estaba solo en la web).
// El semáforo se calcula solo: esta pantalla es para consultar cómo quedó cada remate vigente y cuáles
// no tienen precio de referencia (GET /admin/publicaciones).

type Vista = 'comparados' | 'sin_referencia';

const POR_TANDA = 20; // cuántas propiedades se muestran de una vez

const ZONA_DE_PRECIO: Record<Zona, string> = {
  verde: 'Verde · 2 puntos',
  amarillo: 'Amarilla · 1 punto',
  rojo: 'Roja · 0 puntos',
};

const DOMINIO: Record<Dominio, string> = {
  exclusivo: 'Dominio exclusivo',
  otro: 'Otro tipo de dominio',
};

function formatCLP(valor: string | null): string {
  if (valor === null) return 'Sin precio';
  return Number(valor).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

// "Remate mar 6 oct · 13:00". Las 00:00 significan "hora no informada" y no se muestran.
function textoRemate(iso: string | null): string {
  if (!iso) return 'Sin fecha de remate';
  const fecha = new Date(iso);
  const dia = fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
  if (fecha.getHours() === 0 && fecha.getMinutes() === 0) return `Remate ${dia}`;
  const hora = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `Remate ${dia} · ${hora}`;
}

// Primero las que se rematan antes; las que no tienen fecha van al final
function compararPorRemate(a: PublicacionAdmin, b: PublicacionAdmin): number {
  const cuando = (p: PublicacionAdmin) => (p.auction_date ? new Date(p.auction_date).getTime() : Infinity);
  if (cuando(a) === cuando(b)) return 0;
  return cuando(a) < cuando(b) ? -1 : 1;
}

@Component({
  selector: 'app-semaforo',
  templateUrl: './semaforo.page.html',
  styleUrls: ['./semaforo.page.scss'],
  standalone: false,
})
export class SemaforoPage {
  private api = inject(ApiService);

  readonly publicaciones = signal<PublicacionAdmin[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly vista = signal<Vista>('comparados');
  readonly tanda = signal(POR_TANDA);

  // Solo las que están en el catálogo (sin las rematadas, retiradas ni quitadas por el admin)
  private vigentes = computed(() => this.publicaciones().filter((p) => estadoPublicacion(p) === 'vigente'));
  readonly cantidadVigentes = computed(() => this.vigentes().length);
  readonly finalizadas = computed(() => this.publicaciones().length - this.vigentes().length);
  readonly totalComparados = computed(() => this.vigentes().filter((p) => p.market_zone !== null).length);
  readonly totalSinReferencia = computed(() => this.vigentes().length - this.totalComparados());

  private enVista = computed(() =>
    this.vigentes()
      .filter((p) => (this.vista() === 'comparados' ? p.market_zone !== null : p.market_zone === null))
      .sort(compararPorRemate),
  );
  readonly cantidadEnVista = computed(() => this.enVista().length);

  readonly visibles = computed(() =>
    this.enVista()
      .slice(0, this.tanda())
      .map((p) => ({
        p,
        meta: `${nombreComuna(p)} · ${p.property_type} · ${textoRemate(p.auction_date)}`,
        zona: textoZona(p),
        precio: formatCLP(p.opening_price),
        zonaDePrecio: p.market_zone ? ZONA_DE_PRECIO[p.market_zone] : 'Sin referencia',
        dominio: p.domain_type ? DOMINIO[p.domain_type] : 'Sin dato en la ficha',
      })),
  );

  readonly subtitulo = computed(() =>
    this.cargando()
      ? 'Cargando...'
      : `Se calcula solo, todos los días · ${plural(this.cantidadVigentes(), 'remate vigente', 'remates vigentes')}`,
  );

  readonly textoFinalizadas = computed(() =>
    this.finalizadas() === 1
      ? 'No se muestra 1 publicación que ya no está en el catálogo.'
      : `No se muestran ${this.finalizadas()} publicaciones que ya no están en el catálogo.`,
  );

  readonly cuantasMas = computed(() => Math.min(POR_TANDA, this.cantidadEnVista() - this.visibles().length));

  async ionViewWillEnter() {
    try {
      this.publicaciones.set(await this.api.get<PublicacionAdmin[]>('/admin/publicaciones'));
      this.error.set(null);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarVista(nueva: Vista) {
    this.vista.set(nueva);
    this.tanda.set(POR_TANDA);
  }

  mostrarMas() {
    this.tanda.set(this.tanda() + POR_TANDA);
  }
}
