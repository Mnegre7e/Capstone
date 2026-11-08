import { Component, computed, effect, inject, input, untracked } from '@angular/core';

import { CATEGORIAS, CategoriaTipo } from '../core/remates';
import { NIVELES, Nivel, PERIODOS, fechaCorta, fechaDelCampo, hoyEnChile } from '../core/reportes';
import { ReportesService, SIN_FILTROS } from '../core/reportes.service';
import { SesionService } from '../core/sesion.service';

// Paso A10: el marco de las pantallas del analista, igual que ReportesLayout de la web: el distintivo
// "Analista · Solo lectura", el menú de sus cuatro pantallas (en el celular queda fijo abajo), el período,
// los filtros de los remates y el buscador. La pantalla elegida va adentro.
// Estilos en theme/_reportes.scss (los mismos de Reportes.css de la web).

export type PantallaReportes = 'resumen' | 'subastas' | 'usuarios' | 'alcance' | 'remate';

@Component({
  selector: 'app-marco-reportes',
  standalone: false,
  templateUrl: './marco-reportes.component.html',
})
export class MarcoReportesComponent {
  readonly rep = inject(ReportesService);
  private sesion = inject(SesionService);

  readonly pantalla = input.required<PantallaReportes>();

  readonly PANTALLAS: { valor: PantallaReportes; ruta: string; texto: string }[] = [
    { valor: 'resumen', ruta: '/analista/resumen', texto: 'Resumen' },
    { valor: 'subastas', ruta: '/analista/subastas', texto: 'Subastas' },
    { valor: 'usuarios', ruta: '/analista/usuarios', texto: 'Usuarios' },
    { valor: 'alcance', ruta: '/analista/alcance', texto: 'Alcance' },
  ];
  readonly PERIODOS = PERIODOS;
  readonly CATEGORIAS = CATEGORIAS;
  readonly NIVELES = NIVELES;
  readonly hoy = hoyEnChile();

  // En la ficha de un remate los filtros no se usan (es una sola cosa)
  readonly enUnaFicha = computed(() => this.pantalla() === 'remate');

  readonly subtitulo = computed(() => {
    const reporte = this.rep.reporte();
    let texto = 'Cómo se está usando HouseGreen.';
    if (reporte) {
      const desde = fechaCorta(reporte.desde);
      const hasta = fechaCorta(reporte.hasta);
      texto = desde === hasta ? `${desde}.` : `Del ${desde} al ${hasta}.`;
    }
    return `${texto} Ves totales, sin datos personales.`;
  });

  readonly rangoMostrado = computed(() => {
    const pedido = this.rep.rangoPedido();
    return pedido ? `Mostrando del ${fechaDelCampo(pedido.desde)} al ${fechaDelCampo(pedido.hasta)}.` : '';
  });

  constructor() {
    // Se pide el reporte al abrir la pantalla y cada vez que cambia el período, el rango o un filtro
    // (si ya está el mismo, no se vuelve a pedir)
    effect(() => {
      this.rep.consulta();
      this.sesion.usuario();
      untracked(() => this.rep.actualizar());
    });
  }

  enviarRango(evento: Event) {
    evento.preventDefault();
    this.rep.pedirRango();
  }

  cambiarDesde(evento: Event) {
    this.rep.cambiarRango({ desde: (evento.target as HTMLInputElement).value });
  }

  cambiarHasta(evento: Event) {
    this.rep.cambiarRango({ hasta: (evento.target as HTMLInputElement).value });
  }

  elegirComuna(evento: Event) {
    this.rep.cambiarFiltro({ comuna: (evento.target as HTMLSelectElement).value });
  }

  elegirTipo(evento: Event) {
    this.rep.cambiarFiltro({ tipo: (evento.target as HTMLSelectElement).value as '' | CategoriaTipo });
  }

  elegirSemaforo(evento: Event) {
    this.rep.cambiarFiltro({ semaforo: (evento.target as HTMLSelectElement).value as '' | Nivel });
  }

  quitarFiltros() {
    this.rep.cambiarFiltro(SIN_FILTROS);
  }
}
