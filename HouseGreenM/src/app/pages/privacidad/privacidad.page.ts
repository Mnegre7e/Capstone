import { Component, inject } from '@angular/core';
import { NavController } from '@ionic/angular/lazy';

// Paso A5: política de privacidad (Ley 19.628, actualizada por la Ley 21.719), la misma de la web.
// Se ve con o sin cuenta: el registro la enlaza ("Al crear tu cuenta aceptas la Política de privacidad").
@Component({
  selector: 'app-privacidad',
  templateUrl: './privacidad.page.html',
  styleUrls: ['./privacidad.page.scss'],
  standalone: false,
})
export class PrivacidadPage {
  private navegacion = inject(NavController);

  readonly VERSION = 'Versión 1.0 · noviembre de 2026';

  volver() {
    this.navegacion.back();
  }
}
