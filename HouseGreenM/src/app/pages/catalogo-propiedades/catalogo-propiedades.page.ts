import { Component, computed, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular/lazy';

import { mensajeDeError } from '../../core/api.service';
import { CatalogoService } from '../../core/catalogo.service';
import {
  CATEGORIAS,
  CategoriaTipo,
  DIAS_PREMIUM,
  NOMBRE_RIESGO,
  PRECIO_PREMIUM_TEXTO,
  Remate,
  Riesgo,
  categoriaDeTipo,
  normalizar,
  remateFinalizado,
  remateRetirado,
} from '../../core/remates';
import { SesionService } from '../../core/sesion.service';

// Paso A2: el catálogo con los remates reales, igual que en la web: buscador, filtros y orden,
// "Solo favoritos", tarjetas de a 24 y el aviso del plan Premium.

type Orden = 'recientes' | 'remate' | 'precio_asc' | 'precio_desc' | 'alfabetico' | 'superficie';

const OPCIONES_ORDEN: { valor: Orden; texto: string }[] = [
  { valor: 'recientes', texto: 'Más recientes' },
  { valor: 'remate', texto: 'Fecha de remate, más próximo primero' },
  { valor: 'precio_asc', texto: 'Precio: de menor a mayor' },
  { valor: 'precio_desc', texto: 'Precio: de mayor a menor' },
  { valor: 'alfabetico', texto: 'Alfabético (A–Z)' },
  { valor: 'superficie', texto: 'Superficie (m²), mayor primero' },
];

// Botones rápidos de precio (null = sin límite)
const RANGOS_PRECIO: { texto: string; desde: number | null; hasta: number | null }[] = [
  { texto: 'Hasta $40M', desde: null, hasta: 40_000_000 },
  { texto: '$40M – $80M', desde: 40_000_000, hasta: 80_000_000 },
  { texto: '$80M – $150M', desde: 80_000_000, hasta: 150_000_000 },
  { texto: 'Más de $150M', desde: 150_000_000, hasta: null },
];

const POR_TANDA = 24;

function alternar<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

@Component({
  selector: 'app-catalogo-propiedades',
  templateUrl: './catalogo-propiedades.page.html',
  styleUrls: ['./catalogo-propiedades.page.scss'],
  standalone: false,
})
export class CatalogoPropiedadesPage {
  private catalogo = inject(CatalogoService);
  private sesion = inject(SesionService);
  private avisos = inject(ToastController);

  readonly OPCIONES_ORDEN = OPCIONES_ORDEN;
  readonly RANGOS_PRECIO = RANGOS_PRECIO;
  readonly RIESGOS: Riesgo[] = ['verde', 'amarillo', 'rojo'];
  readonly NOMBRE_RIESGO = NOMBRE_RIESGO;
  readonly PRECIO_PREMIUM_TEXTO = PRECIO_PREMIUM_TEXTO;
  readonly DIAS_PREMIUM = DIAS_PREMIUM;

  readonly cargando = this.catalogo.cargando;
  readonly error = this.catalogo.error;
  readonly comunasPorId = this.catalogo.comunasPorId;
  readonly conPremium = computed(() => this.sesion.usuario()?.acceso_completo ?? false);

  // Lo que la persona eligió
  readonly busqueda = signal('');
  readonly soloFavoritos = signal(false);
  readonly panelAbierto = signal(false);
  readonly orden = signal<Orden>('recientes');
  readonly precioDesde = signal<number | null>(null);
  readonly precioHasta = signal<number | null>(null);
  readonly comunasElegidas = signal<string[]>([]);
  readonly tiposElegidos = signal<CategoriaTipo[]>([]);
  readonly riesgosElegidos = signal<Riesgo[]>([]);

  // Comunas que aparecen en los remates, de la A a la Z
  readonly comunas = computed(() => {
    const nombres = this.catalogo.remates().map((r) => this.comunasPorId()[r.comuna_id]).filter(Boolean);
    return [...new Set(nombres)].sort((a, b) => a.localeCompare(b, 'es'));
  });

  // Cuántos remates vigentes hay de cada tipo (el número que sale en cada botón)
  readonly cantidadPorCategoria = computed(() => {
    const cantidades: Partial<Record<CategoriaTipo, number>> = {};
    for (const r of this.catalogo.remates()) {
      if (remateFinalizado(r.auction_date) || remateRetirado(r.status)) continue;
      const categoria = categoriaDeTipo(r.property_type);
      cantidades[categoria] = (cantidades[categoria] ?? 0) + 1;
    }
    return cantidades;
  });

  readonly categorias = computed(() =>
    CATEGORIAS.filter((c) => (this.cantidadPorCategoria()[c.valor] ?? 0) > 0 || this.tiposElegidos().includes(c.valor)),
  );

  readonly filtrados = computed(() => {
    const texto = normalizar(this.busqueda());
    const favoritos = this.catalogo.favoritos();
    const resultado = this.catalogo.remates().filter((r) => {
      const comuna = this.comunasPorId()[r.comuna_id] || '';
      const precio = Number(r.opening_price);
      const riesgo = r.evaluation?.result_level ?? 'amarillo';
      const coincide =
        normalizar(r.title).includes(texto) ||
        normalizar(comuna).includes(texto) ||
        normalizar(r.address ?? '').includes(texto);
      return (
        coincide &&
        (!this.soloFavoritos() || favoritos.has(r.id)) &&
        // Los remates ya realizados o retirados solo se ven en "Solo favoritos"
        (this.soloFavoritos() || (!remateFinalizado(r.auction_date) && !remateRetirado(r.status))) &&
        (this.precioDesde() === null || precio >= this.precioDesde()!) &&
        (this.precioHasta() === null || precio <= this.precioHasta()!) &&
        (this.comunasElegidas().length === 0 || this.comunasElegidas().includes(comuna)) &&
        (this.tiposElegidos().length === 0 || this.tiposElegidos().includes(categoriaDeTipo(r.property_type))) &&
        (this.riesgosElegidos().length === 0 || this.riesgosElegidos().includes(riesgo))
      );
    });
    const superficie = (r: Remate) => Number(r.physical_info?.surface_m2 ?? -1);
    const fechaRemate = (r: Remate) => (r.auction_date ? new Date(r.auction_date).getTime() : Infinity);
    const orden = this.orden();
    return resultado.sort((a, b) => {
      if (orden === 'remate' && fechaRemate(a) !== fechaRemate(b)) return fechaRemate(a) < fechaRemate(b) ? -1 : 1;
      if (orden === 'precio_asc') return Number(a.opening_price) - Number(b.opening_price);
      if (orden === 'precio_desc') return Number(b.opening_price) - Number(a.opening_price);
      if (orden === 'alfabetico') return a.title.localeCompare(b.title, 'es');
      if (orden === 'superficie') return superficie(b) - superficie(a);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  });

  // De a 24: si cambia la búsqueda, un filtro o el orden, se vuelve a las primeras 24
  private firma = computed(() =>
    JSON.stringify([
      this.busqueda(),
      this.soloFavoritos(),
      this.orden(),
      this.precioDesde(),
      this.precioHasta(),
      this.comunasElegidas(),
      this.tiposElegidos(),
      this.riesgosElegidos(),
    ]),
  );
  private tanda = signal({ firma: '', cantidad: POR_TANDA });
  private cantidadVisible = computed(() => (this.tanda().firma === this.firma() ? this.tanda().cantidad : POR_TANDA));
  readonly visibles = computed(() => this.filtrados().slice(0, this.cantidadVisible()));
  readonly faltan = computed(() => this.filtrados().length - this.visibles().length);

  readonly filtrosActivos = computed(
    () =>
      this.comunasElegidas().length +
      this.tiposElegidos().length +
      this.riesgosElegidos().length +
      (this.precioDesde() !== null || this.precioHasta() !== null ? 1 : 0),
  );
  readonly textoOrden = computed(() => OPCIONES_ORDEN.find((o) => o.valor === this.orden())?.texto);

  // Cada vez que se abre el catálogo se piden los datos de nuevo (remates nuevos, cambios del admin)
  ionViewWillEnter() {
    void this.catalogo.recargar();
  }

  async refrescar(evento: Event) {
    await this.catalogo.recargar();
    // El círculo de "cargando" de arriba se esconde cuando terminan de llegar los datos
    await (evento.target as unknown as { complete: () => Promise<void> }).complete();
  }

  mostrarMas() {
    this.tanda.set({ firma: this.firma(), cantidad: this.cantidadVisible() + POR_TANDA });
  }

  nombreComuna(remate: Remate): string {
    return this.comunasPorId()[remate.comuna_id] || '';
  }

  esFavorito(remate: Remate): boolean {
    return this.catalogo.favoritos().has(remate.id);
  }

  async alternarFavorito(remate: Remate) {
    if (!this.conPremium()) {
      await this.mostrarAviso(`Guardar favoritos es parte del plan Premium: ${PRECIO_PREMIUM_TEXTO} por ${DIAS_PREMIUM} días.`);
      return;
    }
    try {
      await this.catalogo.alternarFavorito(remate.id);
    } catch (error) {
      await this.mostrarAviso(mensajeDeError(error));
    }
  }

  // --- Filtros ---
  elegirRango(rango: { desde: number | null; hasta: number | null }) {
    const activo = this.rangoActivo(rango);
    this.precioDesde.set(activo ? null : rango.desde);
    this.precioHasta.set(activo ? null : rango.hasta);
  }

  rangoActivo(rango: { desde: number | null; hasta: number | null }): boolean {
    return this.precioDesde() === rango.desde && this.precioHasta() === rango.hasta;
  }

  /** "$40.000.000" -> 40000000 (vacío = sin límite) */
  leerPesos(texto: string): number | null {
    const digitos = texto.replace(/\D/g, '');
    return digitos === '' ? null : Number(digitos);
  }

  mostrarPesos(valor: number | null): string {
    return valor === null ? '' : `$${valor.toLocaleString('es-CL')}`;
  }

  alternarComuna(comuna: string) {
    this.comunasElegidas.set(alternar(this.comunasElegidas(), comuna));
  }

  alternarTipo(tipo: CategoriaTipo) {
    this.tiposElegidos.set(alternar(this.tiposElegidos(), tipo));
  }

  alternarRiesgo(riesgo: Riesgo) {
    this.riesgosElegidos.set(alternar(this.riesgosElegidos(), riesgo));
  }

  limpiar() {
    this.orden.set('recientes');
    this.precioDesde.set(null);
    this.precioHasta.set(null);
    this.comunasElegidas.set([]);
    this.tiposElegidos.set([]);
    this.riesgosElegidos.set([]);
  }

  private async mostrarAviso(mensaje: string) {
    const aviso = await this.avisos.create({ message: mensaje, duration: 3000, position: 'bottom' });
    await aviso.present();
  }
}
