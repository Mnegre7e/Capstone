import { Component, effect, inject } from '@angular/core';
import { MenuController } from '@ionic/angular/lazy';
import { register } from 'swiper/element/bundle';

import { AvisosService } from './core/avisos.service';
import { SesionService } from './core/sesion.service';
import { ROL_ADMIN, ROL_ANALISTA } from './core/modelos';
import { environment } from '../environments/environment';

register();

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private sesion = inject(SesionService);
  private menu = inject(MenuController);
  readonly avisos = inject(AvisosService); // Paso A7: el número rojo de Alertas en el menú

  // Paso A1: el menú lateral cambia según quién inició sesión
  readonly usuario = this.sesion.usuario;
  readonly ROL_ADMIN = ROL_ADMIN;
  readonly ROL_ANALISTA = ROL_ANALISTA;
  // Paso A20: "9 nov 2026, 19:40" (solo en la app instalada; "npm run android" anota cuándo se armó)
  readonly version = environment.compilada
    ? new Date(environment.compilada).toLocaleString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  constructor() {
    // El menú solo se puede abrir con una sesión iniciada
    effect(() => {
      void this.menu.enable(this.sesion.conSesion());
    });
  }

  cerrarSesion(): Promise<void> {
    return this.sesion.salir();
  }

  // Paso A21: al abrir el menú se revisa si llegó algo nuevo, sin tener que entrar a Alertas
  revisarAvisos(): void {
    void this.avisos.revisar();
  }
}
