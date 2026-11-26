import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// Pasos 135, 135b y 135c: el visor de Google (vista de calle o mapa), del mismo tamaño que la foto principal.
// La galería (galeria-fotos.component) pide la dirección a la API y lo muestra como PRIMER cuadro.
// Reglas de Google: la imagen va dentro de su visor (con su marca) y no se descarga ni se guarda.

// Solo se aceptan los visores de Google (por seguridad, ninguna otra página entra en el recuadro)
export const VISOR_DE_GOOGLE = 'https://www.google.com/maps/embed/v1/';

@Component({
  selector: 'app-vista-calle',
  standalone: false,
  templateUrl: './vista-calle.component.html',
  styleUrls: ['./vista-calle.component.scss'],
})
export class VistaCalleComponent {
  private sanitizer = inject(DomSanitizer);

  readonly url = input.required<string>();
  readonly titulo = input('');
  readonly tipo = input('calle'); // 'calle' (vista de calle) o 'mapa'

  /** La dirección del visor, marcada como segura solo si es de Google. */
  readonly urlSegura = computed<SafeResourceUrl | null>(() =>
    this.url().startsWith(VISOR_DE_GOOGLE) ? this.sanitizer.bypassSecurityTrustResourceUrl(this.url()) : null,
  );

  readonly tituloVisor = computed(
    () => `${this.tipo() === 'mapa' ? 'Mapa' : 'Vista de calle'} de ${this.titulo() || 'la propiedad'} (Google)`,
  );
}
