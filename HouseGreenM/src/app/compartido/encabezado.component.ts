import { Component } from '@angular/core';

// Paso A2: el encabezado de las pantallas, igual al de la web: el logo (el semáforo) y el nombre
// a la izquierda, y el botón del menú (☰) a la derecha.
@Component({
  selector: 'app-encabezado',
  standalone: false,
  template: `
    <ion-header class="ion-no-border hg-encabezado">
      <ion-toolbar>
        <div slot="start" class="hg-logo">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="#0f3d30" />
            <circle cx="32" cy="15" r="7.5" fill="#ef4444" />
            <circle cx="32" cy="32" r="7.5" fill="#facc15" />
            <circle cx="32" cy="49" r="7.5" fill="#22c55e" />
          </svg>
          <span>HouseGreen</span>
        </div>
        <ion-buttons slot="end">
          <ion-menu-button aria-label="Abrir el menú"></ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
  `,
})
export class EncabezadoComponent {}
