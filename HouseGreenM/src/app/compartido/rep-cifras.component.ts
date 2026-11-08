import { Component, input } from '@angular/core';

import { CifraReporte } from '../core/reportes';

// Paso A10: una pieza de las pantallas del analista, igual que pages/reportes/piezas.tsx de la web
// (lleva las mismas clases de la web; estilos en theme/_reportes.scss).

// ---------- Cifras grandes (4 por fila en PC, 2 en celular) ----------
@Component({
  selector: 'app-rep-cifras',
  standalone: false,
  host: { class: 'rep-cifras' },
  template: `
    @for (cifra of cifras(); track cifra.titulo) {
      <div class="rep-cifra">
        <p class="rep-cifra-titulo">{{ cifra.titulo }}</p>
        <p class="rep-cifra-valor">{{ cifra.valor }}</p>
        @if (cifra.nota) {
          <p class="rep-cifra-nota">{{ cifra.nota }}</p>
        }
      </div>
    }
  `,
})
export class CifrasReporteComponent {
  readonly cifras = input.required<CifraReporte[]>();
}
