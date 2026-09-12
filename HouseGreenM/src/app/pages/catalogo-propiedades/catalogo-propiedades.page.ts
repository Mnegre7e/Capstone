import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

interface Propiedad {
  id: number;
  titulo: string;
  precio: number;
  ubicacion: string;
  imagen: string;
  estado: string;
}

@Component({
  selector: 'app-catalogo-propiedades',
  templateUrl: './catalogo-propiedades.page.html',
  styleUrls: ['./catalogo-propiedades.page.scss'],
  standalone: false
})
export class CatalogoPropiedadesPage {

  private router = inject(Router);

  propiedades: Propiedad[] = [
    {
      id: 1,
      titulo: 'Departamento en Santiago Centro',
      precio: 45000000,
      ubicacion: 'Santiago, RM',
      imagen: 'https://ionicframework.com/docs/img/demos/card-media.png',
      estado: 'Oportunidad'
    },
    {
      id: 2,
      titulo: 'Casa Habitación Providencia',
      precio: 120000000,
      ubicacion: 'Providencia, RM',
      imagen: 'https://ionicframework.com/docs/img/demos/card-media.png',
      estado: 'En Evaluación'
    }
  ];

  verDetalle(id: number) {
    this.router.navigate(['/detalle-propiedad'], { queryParams: { id } });
  }
}