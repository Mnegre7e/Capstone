import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface MarcadorPropiedad {
  id: number;
  titulo: string;
  precio: number;
  latitud: number;
  longitud: number;
}

@Component({
  selector: 'app-mapa-propiedades',
  templateUrl: './mapa-propiedades.page.html',
  styleUrls: ['./mapa-propiedades.page.scss'],
  standalone: false
})
export class MapaPropiedadesPage {

  private router = inject(Router);

  propiedadesMapa: MarcadorPropiedad[] = [
    { id: 1, titulo: 'Departamento Santiago Centro', precio: 45000000, latitud: -33.4489, longitud: -70.6693 },
    { id: 2, titulo: 'Casa Habitación Providencia', precio: 120000000, latitud: -33.4314, longitud: -70.6093 }
  ];

  verDetalle(id: number) {
    this.router.navigate(['/detalle-propiedad'], { queryParams: { id } });
  }
}