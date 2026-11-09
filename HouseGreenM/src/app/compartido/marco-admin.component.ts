import { Component, input } from '@angular/core';

// Paso A9: el marco de las pantallas del administrador, igual que AdminLayout de la web: el distintivo
// "Administrador" y las pestañas de sus secciones (en el celular quedan fijas abajo, como en la web).
// Paso A13: con la pestaña Semáforo, igual que la web (Cargas, Pagos y Registro de actividad se abren desde el Panel).
// Estilos en theme/_admin.scss.

export type SeccionAdmin =
  | 'panel'
  | 'publicaciones'
  | 'semaforo'
  | 'opiniones'
  | 'anuncios'
  | 'usuarios'
  | 'cargas'
  | 'pagos'
  | 'auditoria'
  | 'reportes';

@Component({
  selector: 'app-marco-admin',
  standalone: false,
  template: `
    <div class="admin-layout">
      <span class="admin-chip">Administrador</span>

      <nav class="admin-nav" aria-label="Secciones del administrador">
        @for (s of SECCIONES; track s.valor) {
          <a
            class="admin-nav-link"
            routerDirection="root"
            [class.is-activo]="seccion() === s.valor"
            [attr.aria-current]="seccion() === s.valor ? 'page' : null"
            [routerLink]="[s.ruta]">
            {{ s.texto }}
          </a>
        }
      </nav>

      <main class="admin-contenido">
        <ng-content></ng-content>
      </main>
    </div>
  `,
})
export class MarcoAdminComponent {
  readonly seccion = input.required<SeccionAdmin>();

  readonly SECCIONES: { valor: SeccionAdmin; ruta: string; texto: string }[] = [
    { valor: 'panel', ruta: '/admin-home', texto: 'Panel' },
    { valor: 'publicaciones', ruta: '/publicaciones', texto: 'Publicaciones' },
    { valor: 'semaforo', ruta: '/semaforo', texto: 'Semáforo' },
    { valor: 'opiniones', ruta: '/opiniones', texto: 'Opiniones' },
    { valor: 'anuncios', ruta: '/anuncios', texto: 'Anuncios' },
  ];
}
