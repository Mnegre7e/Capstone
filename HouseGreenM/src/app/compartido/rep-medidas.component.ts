import { Component, computed, input, model } from '@angular/core';

import { Medida, MEDIDAS } from '../core/reportes';

// Paso A10: una pieza de las pantallas del analista, igual que pages/reportes/piezas.tsx de la web
// (lleva las mismas clases de la web; estilos en theme/_reportes.scss).

// ---------- Botones para elegir la medida del gráfico ----------
@Component({
  selector: 'app-rep-medidas',
  standalone: false,
  host: { class: 'rep-medidas', role: 'group', 'aria-label': 'Qué mostrar en el gráfico' },
  template: `
    @for (m of disponibles(); track m.valor) {
      <button
        type="button"
        class="rep-medida"
        [class.is-elegida]="medida() === m.valor"
        [attr.aria-pressed]="medida() === m.valor"
        (click)="medida.set(m.valor)">
        {{ m.nombre }}
      </button>
    }
  `,
})
export class MedidasReporteComponent {
  readonly opciones = input.required<Medida[]>();
  readonly medida = model.required<Medida>();

  readonly disponibles = computed(() => MEDIDAS.filter((m) => this.opciones().includes(m.valor)));
}
