import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiService, mensajeDeError } from './api.service';
import { CATEGORIAS, CategoriaTipo, Comuna } from './remates';
import { NIVELES, Nivel, Periodo, Reporte, hoyEnChile, textoDelPeriodo } from './reportes';
import { SesionService } from './sesion.service';

// Paso A10: lo que comparten las cuatro pantallas del analista, igual que ReportesLayout de la web:
// el período, el rango, los filtros y el reporte. El reporte se pide una sola vez por período y filtros,
// y lo usan Resumen, Subastas, Usuarios y Alcance (al cambiar de pantalla no se vuelve a pedir).

export interface FiltrosReporte {
  comuna: string; // el id de la comuna, o "" = todas
  tipo: '' | CategoriaTipo;
  semaforo: '' | Nivel;
}

export const SIN_FILTROS: FiltrosReporte = { comuna: '', tipo: '', semaforo: '' };

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private api = inject(ApiService);
  private sesion = inject(SesionService);

  readonly periodo = signal<Periodo>('mes');
  // El rango que se está escribiendo y el que se pidió (se pide al tocar "Ver")
  readonly rango = signal(rangoInicial());
  readonly rangoPedido = signal<{ desde: string; hasta: string } | null>(null);
  readonly errorDelRango = signal<string | null>(null);
  readonly filtros = signal<FiltrosReporte>(SIN_FILTROS);
  readonly reporte = signal<Reporte | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  // Las comunas para el filtro, en orden alfabético
  readonly comunas = signal<{ id: string; nombre: string }[]>([]);

  // Solo el período (lo usa también la ficha de un remate)
  readonly consultaDelPeriodo = computed(() => {
    const parametros = new URLSearchParams({ periodo: this.periodo() });
    if (this.periodo() === 'rango') {
      const pedido = this.rangoPedido();
      if (!pedido) {
        return null;
      }
      parametros.set('desde', pedido.desde);
      parametros.set('hasta', pedido.hasta);
    }
    return parametros.toString();
  });

  // Lo que se le pide a la API (null mientras se elige un rango que todavía no se pidió)
  readonly consulta = computed(() => {
    const delPeriodo = this.consultaDelPeriodo();
    if (delPeriodo === null) {
      return null;
    }
    const parametros = new URLSearchParams(delPeriodo);
    const filtros = this.filtros();
    if (filtros.comuna) {
      parametros.set('comuna_id', filtros.comuna);
    }
    if (filtros.tipo) {
      parametros.set('tipo', filtros.tipo);
    }
    if (filtros.semaforo) {
      parametros.set('semaforo', filtros.semaforo);
    }
    return parametros.toString();
  });

  // El texto del período va después de "en" en las pantallas ("se registraron en este mes").
  // Sale del reporte que se está mostrando, para que siempre coincida con los números.
  readonly textoPeriodo = computed(() => {
    const reporte = this.reporte();
    return reporte ? textoDelPeriodo(reporte) : '';
  });

  // Los filtros con que se calculó el reporte que se muestra (para el aviso de "Filtrado por")
  readonly filtrosDelReporte = computed(() => {
    const reporte = this.reporte();
    if (!reporte) {
      return [];
    }
    return [
      reporte.filtros.comuna,
      CATEGORIAS.find((c) => c.valor === reporte.filtros.tipo)?.nombre,
      NIVELES.find((n) => n.valor === reporte.filtros.semaforo)?.nombre,
    ].filter((texto): texto is string => Boolean(texto));
  });

  readonly hayFiltros = computed(() => {
    const filtros = this.filtros();
    return filtros.comuna !== '' || filtros.tipo !== '' || filtros.semaforo !== '';
  });

  private pedida: string | null = null; // la última consulta pedida (con de quién es la sesión)
  private turno = 0; // si se cambia algo antes de que llegue la respuesta, se ignora la anterior
  private de: string | null = null; // de quién es lo que se está mostrando
  private pidiendoComunas = false;

  /** Pide el reporte si cambió el período, el rango, los filtros o la cuenta (lo llama el marco de las pantallas). */
  actualizar(): void {
    const usuario = this.sesion.usuario()?.id ?? null;
    if (usuario === null) {
      return;
    }
    if (usuario !== this.de) {
      this.reiniciar(usuario); // otra cuenta: se parte de cero, como al abrir la web
    }
    if (this.comunas().length === 0) {
      void this.pedirComunas();
    }
    const consulta = this.consulta();
    if (consulta === null) {
      return;
    }
    const clave = `${usuario}|${consulta}`;
    if (clave === this.pedida) {
      return;
    }
    this.pedida = clave;
    const turno = ++this.turno;
    this.cargando.set(true);
    this.api
      .get<Reporte>(`/reportes?${consulta}`)
      .then((datos) => {
        if (turno === this.turno) {
          this.reporte.set(datos);
          this.error.set(null);
        }
      })
      .catch((error) => {
        if (turno === this.turno) {
          this.error.set(mensajeDeError(error));
          this.pedida = null; // se vuelve a intentar al abrir otra pantalla o cambiar algo
        }
      })
      .finally(() => {
        if (turno === this.turno) {
          this.cargando.set(false);
        }
      });
  }

  cambiarPeriodo(nuevo: Periodo): void {
    if (nuevo === this.periodo()) {
      return;
    }
    this.periodo.set(nuevo);
    this.errorDelRango.set(null);
    // El rango se pide recién al tocar "Ver"; los demás se piden altiro ("Actualizando..." hasta que lleguen)
    if (nuevo === 'rango') {
      this.rangoPedido.set(null);
    }
  }

  cambiarRango(cambio: Partial<{ desde: string; hasta: string }>): void {
    this.rango.update((actual) => ({ ...actual, ...cambio }));
  }

  pedirRango(): void {
    const rango = this.rango();
    const hoy = hoyEnChile();
    if (!rango.desde || !rango.hasta) {
      this.errorDelRango.set('Elige las dos fechas.');
      return;
    }
    if (rango.desde > rango.hasta) {
      this.errorDelRango.set('La fecha de inicio no puede ser posterior a la de término.');
      return;
    }
    if (rango.desde > hoy) {
      this.errorDelRango.set('El rango no puede empezar en el futuro.');
      return;
    }
    this.errorDelRango.set(null);
    this.rangoPedido.set({ ...rango });
  }

  cambiarFiltro(cambio: Partial<FiltrosReporte>): void {
    this.filtros.update((actuales) => ({ ...actuales, ...cambio }));
  }

  private reiniciar(usuario: string): void {
    this.de = usuario;
    this.pedida = null;
    this.turno++;
    this.periodo.set('mes');
    this.rango.set(rangoInicial());
    this.rangoPedido.set(null);
    this.errorDelRango.set(null);
    this.filtros.set(SIN_FILTROS);
    this.reporte.set(null);
    this.error.set(null);
    this.cargando.set(true);
  }

  private async pedirComunas(): Promise<void> {
    if (this.pidiendoComunas) {
      return;
    }
    this.pidiendoComunas = true;
    try {
      const comunas = await this.api.get<Comuna[]>('/comunas');
      this.comunas.set(
        comunas
          .map((c) => ({ id: String(c.id), nombre: c.name }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      );
    } catch {
      // Sin comunas el filtro queda solo con "Todas"; se vuelven a pedir al abrir otra pantalla
    } finally {
      this.pidiendoComunas = false;
    }
  }
}

// Del primer día del mes hasta hoy
function rangoInicial(): { desde: string; hasta: string } {
  const hoy = hoyEnChile();
  return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
}
