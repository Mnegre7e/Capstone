import { Component, input } from '@angular/core';

// Paso A10: una pieza de las pantallas del analista, igual que pages/reportes/piezas.tsx de la web
// (lleva las mismas clases de la web; estilos en theme/_reportes.scss).

// ---------- Tarjeta con título (los botones de la medida del gráfico van al lado del título) ----------
@Component({
  selector: 'app-rep-tarjeta',
  standalone: false,
  host: { class: 'rep-tarjeta' },
  template: `
    <div class="rep-tarjeta-cabecera">
      <h2>{{ titulo() }}</h2>
      <ng-content select="app-rep-medidas"></ng-content>
    </div>
    <ng-content></ng-content>
  `,
})
export class TarjetaReporteComponent {
  readonly titulo = input.required<string>();
}
