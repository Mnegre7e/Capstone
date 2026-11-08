import { Component, computed, input } from '@angular/core';

import { FilaBarras, numero, porcentaje } from '../core/reportes';

// Paso A10: una pieza de las pantallas del analista, igual que pages/reportes/piezas.tsx de la web
// (lleva las mismas clases de la web; estilos en theme/_reportes.scss).

// ---------- Barras horizontales: una fila por cosa (comuna, tipo, paso del embudo...) ----------
// El largo de cada barra es relativo a la más grande; el número va siempre escrito al lado.
@Component({
  selector: 'app-rep-barras',
  standalone: false,
  template: `
    @if (vacia()) {
      <p class="rep-vacio">{{ vacio() }}</p>
    } @else {
      <ul class="rep-barras">
        @for (fila of filas(); track fila.nombre) {
          <li>
            <span class="rep-barras-nombre"
              >{{ fila.nombre }}@if (fila.nota) {<span class="rep-gris"> · {{ fila.nota }}</span>}</span
            >
            <span class="rep-barras-pista" aria-hidden="true">
              <!-- Con 0 no se dibuja relleno: la pista queda vacía -->
              @if (fila.cantidad > 0) {
                <span class="rep-barras-relleno" [style.width.%]="(fila.cantidad / maximo()) * 100"></span>
              }
            </span>
            <span class="rep-barras-valor"
              >{{ numero(fila.cantidad) }}@if (total() !== null) {<span class="rep-gris"> {{ textoPorcentaje(fila.cantidad) }}</span>}</span
            >
          </li>
        }
      </ul>
    }
  `,
})
export class BarrasReporteComponent {
  readonly filas = input.required<FilaBarras[]>();
  readonly total = input<number | null>(null); // si viene, se muestra también el porcentaje
  readonly vacio = input.required<string>();

  readonly maximo = computed(() => Math.max(...this.filas().map((f) => f.cantidad), 0));
  readonly vacia = computed(() => this.filas().length === 0 || this.maximo() === 0);
  readonly numero = numero;

  textoPorcentaje(cantidad: number): string {
    return porcentaje(cantidad, this.total() ?? 0);
  }
}
