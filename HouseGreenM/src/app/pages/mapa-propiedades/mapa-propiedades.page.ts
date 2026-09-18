import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface PropiedadMapa {
  id: number;
  titulo: string;
  precio: number;
  comuna: string;
}

@Component({
  selector: 'app-mapa-propiedades',
  templateUrl: './mapa-propiedades.page.html',
  styleUrls: ['./mapa-propiedades.page.scss'],
  standalone: false
})
export class MapaPropiedadesPage implements OnInit {

  propiedadesMapa: PropiedadMapa[] = [
    { id: 1, titulo: 'Departamento Santiago Centro', precio: 42000000, comuna: 'Santiago' },
    { id: 2, titulo: 'Casa Habitación Providencia', precio: 98000000, comuna: 'Providencia' },
    { id: 3, titulo: 'Oficina Comercial Las Condes', precio: 65000000, comuna: 'Las Condes' },
    { id: 4, titulo: 'Terreno Urbano Maipú', precio: 35000000, comuna: 'Maipú' }
  ];

  constructor(private router: Router) {}

  ngOnInit() {}

  // Formato de moneda en pesos chilenos ($42.000.000)
  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined || isNaN(valor)) return '$0';
    return '$' + valor.toLocaleString('es-CL');
  }

  verDetalle(id: number) {
    this.router.navigate(['/detalle-propiedad', id]);
  }
}