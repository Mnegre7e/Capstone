import { Component, computed, input } from '@angular/core';

import { NIVELES, numero, porcentaje } from '../core/reportes';

// Paso A10: una pieza de las pantallas del analista, igual que pages/reportes/piezas.tsx de la web
// (lleva las mismas clases de la web; estilos en theme/_reportes.scss).

// ---------- Barra del semáforo con su leyenda ----------
@Component({
  selector: 'app-rep-semaforo',
  standalone: false,
  template: `
    @if (total() === 0) {
      <p class="rep-vacio">No hay remates vigentes.</p>
    } @else {
      <div class="rep-barra-semaforo" role="img" [attr.aria-label]="etiqueta()">
        @for (nivel of conCantidad(); track nivel.valor) {
          <span
            [class]="'rep-parte is-' + nivel.valor"
            [style.flex-grow]="nivel.cantidad"
            [attr.title]="nivel.nombre + ': ' + numero(nivel.cantidad) + ' (' + textoPorcentaje(nivel.cantidad) + ')'"></span>
        }
      </div>
      <!-- La leyenda lleva el nombre y la cantidad: el color nunca va solo -->
      <ul class="rep-leyenda">
        @for (nivel of niveles(); track nivel.valor) {
          <li>
            <span [class]="'rep-leyenda-color is-' + nivel.valor" aria-hidden="true"></span>
            <span class="rep-gris">{{ nivel.nombre }}</span>
            <strong>{{ numero(nivel.cantidad) }}</strong>
            <span class="rep-gris">{{ textoPorcentaje(nivel.cantidad) }}</span>
          </li>
        }
      </ul>
    }
  `,
})
export class SemaforoReporteComponent {
  readonly semaforo = input.required<Record<string, number>>();

  readonly niveles = computed(() => NIVELES.map((nivel) => ({ ...nivel, cantidad: this.semaforo()[nivel.valor] ?? 0 })));
  readonly conCantidad = computed(() => this.niveles().filter((nivel) => nivel.cantidad > 0));
  readonly total = computed(() => this.niveles().reduce((suma, nivel) => suma + nivel.cantidad, 0));
  readonly etiqueta = computed(() => this.niveles().map((nivel) => `${nivel.nombre}: ${nivel.cantidad}`).join(', '));
  readonly numero = numero;

  textoPorcentaje(cantidad: number): string {
    return porcentaje(cantidad, this.total());
  }
}
