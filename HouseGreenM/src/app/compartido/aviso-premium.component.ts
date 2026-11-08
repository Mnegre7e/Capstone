import { Component, input } from '@angular/core';

import { BENEFICIOS_PREMIUM, DIAS_PREMIUM, PRECIO_PREMIUM_TEXTO } from '../core/remates';

// Paso A3: aviso para quien no tiene el plan Premium (igual al de la web).
// - "pagina": en lugar del detalle de un remate, con lo que incluye el plan.
// - "compacto": dentro de otra pantalla (por ejemplo, en lugar del formulario de alertas).
@Component({
  selector: 'app-aviso-premium',
  standalone: false,
  templateUrl: './aviso-premium.component.html',
  styleUrls: ['./aviso-premium.component.scss'],
})
export class AvisoPremiumComponent {
  readonly titulo = input.required<string>();
  readonly variante = input<'pagina' | 'compacto'>('pagina');

  readonly BENEFICIOS_PREMIUM = BENEFICIOS_PREMIUM;
  readonly PRECIO_PREMIUM_TEXTO = PRECIO_PREMIUM_TEXTO;
  readonly DIAS_PREMIUM = DIAS_PREMIUM;
}
