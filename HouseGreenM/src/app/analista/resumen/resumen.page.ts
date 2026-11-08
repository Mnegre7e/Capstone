import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SesionService } from '../../core/sesion.service';

@Component({
  selector: 'app-resumen',
  templateUrl: './resumen.page.html',
  styleUrls: ['./resumen.page.scss'],
  standalone: false
})
export class ResumenPage {
  private router = inject(Router);
  private sesion = inject(SesionService);

  // Paso A1c: el botón de salir de arriba a la derecha
  salir() {
    return this.sesion.salir();
  }
  periodo: string = '30d';

  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}