import { Component, computed, input } from '@angular/core';

import { NOMBRE_RIESGO, Riesgo } from '../core/remates';

// Paso A2: la etiqueta del semáforo ("● Riesgo bajo"), con los colores de la web.
@Component({
  selector: 'app-etiqueta-riesgo',
  standalone: false,
  template: `<span [class]="'hg-riesgo hg-riesgo-' + riesgo()"><span class="hg-riesgo-punto"></span>{{ texto() }}</span>`,
})
export class EtiquetaRiesgoComponent {
  readonly riesgo = input.required<Riesgo>();
  readonly texto = computed(() => NOMBRE_RIESGO[this.riesgo()]);
}
