import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SesionService } from '../../core/sesion.service';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.page.html',
  styleUrls: ['./admin-home.page.scss'],
  standalone: false
})
export class AdminHomePage {
  private router = inject(Router);
  private sesion = inject(SesionService);

  // Paso A1c: el botón de salir de arriba a la derecha
  salir() {
    return this.sesion.salir();
  }

  irAPublicaciones() {
    this.router.navigate(['publicaciones']);
  }

  verDetallePublicacion(id: number) {
    this.router.navigate(['publicacion-detalle', id]);
  }
  
  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}