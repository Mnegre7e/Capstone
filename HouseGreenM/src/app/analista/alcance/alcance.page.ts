import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SesionService } from '../../core/sesion.service';

@Component({
  selector: 'app-alcance',
  templateUrl: './alcance.page.html',
  styleUrls: ['./alcance.page.scss'],
  standalone: false
})
export class AlcancePage {
  private router = inject(Router);
  private sesion = inject(SesionService);

  // Paso A1c: el botón de salir de arriba a la derecha
  salir() {
    return this.sesion.salir();
  }
  periodo: string = '7d';

  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}