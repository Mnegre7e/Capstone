import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface Propiedad {
  id: number;
  titulo: string;
  comuna: string;
  precio: number;
  tipo: string;
  imagen: string;
}

@Component({
  selector: 'app-catalogo-propiedades',
  templateUrl: './catalogo-propiedades.page.html',
  styleUrls: ['./catalogo-propiedades.page.scss'],
  standalone: false
})
export class CatalogoPropiedadesPage implements OnInit {

  propiedades: Propiedad[] = [
    { id: 1, titulo: 'Departamento Santiago Centro', comuna: 'Santiago', precio: 42000000, tipo: 'Departamento', imagen: 'assets/icon/logo-housegreen.svg' },
    { id: 2, titulo: 'Casa Habitación Providencia', comuna: 'Providencia', precio: 98000000, tipo: 'Casa', imagen: 'assets/icon/logo-housegreen.svg' },
    { id: 3, titulo: 'Oficina Comercial Las Condes', comuna: 'Las Condes', precio: 65000000, tipo: 'Oficina', imagen: 'assets/icon/logo-housegreen.svg' },
    { id: 4, titulo: 'Terreno Urbano Maipú', comuna: 'Maipú', precio: 35000000, tipo: 'Terreno', imagen: 'assets/icon/logo-housegreen.svg' }
  ];

  constructor(private router: Router) {}

  ngOnInit() {}

  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined || isNaN(valor)) return '$0';
    return '$' + valor.toLocaleString('es-CL');
  }

  verDetalle(id: number) {
    this.router.navigate(['/detalle-propiedad', id]);
  }
}