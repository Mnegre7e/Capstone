import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SesionService } from '../../core/sesion.service';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  standalone: false
})
export class UsuariosPage {
  private router = inject(Router);
  private sesion = inject(SesionService);

  // Paso A1c: el botón de salir de arriba a la derecha
  salir() {
    return this.sesion.salir();
  }

  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}