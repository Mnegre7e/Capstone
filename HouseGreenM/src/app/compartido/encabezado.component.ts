import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular/lazy';

import { ROL_ANALISTA } from '../core/modelos';
import { SesionService } from '../core/sesion.service';

// Paso A2: el encabezado de las pantallas, igual al de la web: el logo (el semáforo) y el nombre
// a la izquierda, y el botón del menú (☰) a la derecha.
// Paso A8b (pedido del equipo): el botón "Volver" a la izquierda en todas las pantallas (menos en la de inicio),
// y al tocar el logo o el nombre HouseGreen se vuelve al catálogo de remates (el analista, a su resumen).
@Component({
  selector: 'app-encabezado',
  standalone: false,
  template: `
    <ion-header class="ion-no-border hg-encabezado">
      <ion-toolbar>
        @if (mostrarVolver()) {
          <ion-buttons slot="start">
            <ion-back-button
              class="hg-volver"
              text="Volver"
              icon="chevron-back"
              aria-label="Volver a la pantalla anterior"
              [defaultHref]="inicio()">
            </ion-back-button>
          </ion-buttons>
        }
        <a slot="start" class="hg-logo" role="link" tabindex="0" [attr.aria-label]="textoLogo()" (click)="irAlInicio()" (keydown.enter)="irAlInicio()">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="#0f3d30" />
            <circle cx="32" cy="15" r="7.5" fill="#ef4444" />
            <circle cx="32" cy="32" r="7.5" fill="#facc15" />
            <circle cx="32" cy="49" r="7.5" fill="#22c55e" />
          </svg>
          <span>HouseGreen</span>
        </a>
        <ion-buttons slot="end">
          <ion-menu-button aria-label="Abrir el menú"></ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
  `,
})
export class EncabezadoComponent {
  private sesion = inject(SesionService);
  private navegacion = inject(NavController);
  private ruta = inject(ActivatedRoute);

  // A dónde lleva el logo: el catálogo (el analista, a su resumen; sin sesión, al inicio de sesión)
  readonly inicio = computed(() => {
    const usuario = this.sesion.usuario();
    if (!usuario) return '/login';
    return usuario.role_id === ROL_ANALISTA ? '/analista/resumen' : '/catalogo-propiedades';
  });
  readonly textoLogo = computed(() =>
    this.inicio() === '/catalogo-propiedades' ? 'HouseGreen: ir al catálogo de remates' : 'HouseGreen: ir al inicio',
  );

  // La dirección de la pantalla donde está este encabezado (por ejemplo "/detalle-propiedad/123")
  private readonly direccion =
    '/' +
    this.ruta.snapshot.pathFromRoot
      .flatMap((parte) => parte.url.map((segmento) => segmento.path))
      .filter((texto) => texto !== '')
      .join('/');

  // En la pantalla de inicio no hay a dónde volver
  readonly mostrarVolver = computed(() => this.direccion !== this.inicio());

  irAlInicio() {
    void this.navegacion.navigateRoot(this.inicio());
  }
}
