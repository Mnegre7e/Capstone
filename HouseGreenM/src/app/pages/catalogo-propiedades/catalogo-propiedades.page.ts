import { Component } from '@angular/core';

export interface PropiedadItem {
  id: number;
  comuna: string;
  titulo: string;
  precioMinimo: number;
  precioM2: number;
  superficie: number;
  fechaRemate: string;
  fechaPublicacion: string;
  riesgoGlobal: 'bajo' | 'medio' | 'alto';
  tipo: 'Departamento' | 'Casa' | 'Oficina' | 'Terreno';
  guardado: boolean;
}

@Component({
  selector: 'app-catalogo-propiedades',
  templateUrl: './catalogo-propiedades.page.html',
  styleUrls: ['./catalogo-propiedades.page.scss'],
  standalone: false
})
export class CatalogoPropiedadesPage {

  textoBusqueda: string = '';

  propiedades: PropiedadItem[] = [
    {
      id: 1,
      comuna: 'SANTIAGO CENTRO',
      titulo: 'Departamento 2D 1B',
      precioMinimo: 42000000,
      precioM2: 875000,
      superficie: 48,
      fechaRemate: 'vie 2 oct · 10:00',
      fechaPublicacion: 'el 18 sep 2026',
      riesgoGlobal: 'bajo',
      tipo: 'Departamento',
      guardado: true
    },
    {
      id: 2,
      comuna: 'MAIPÚ',
      titulo: 'Casa 3D 2B',
      precioMinimo: 68500000,
      precioM2: 744600,
      superficie: 92,
      fechaRemate: 'mié 7 oct · 12:00',
      fechaPublicacion: 'el 21 sep 2026',
      riesgoGlobal: 'medio',
      tipo: 'Casa',
      guardado: true
    },
    {
      id: 3,
      comuna: 'ESTACIÓN CENTRAL',
      titulo: 'Departamento 1D 1B',
      precioMinimo: 31200000,
      precioM2: 866700,
      superficie: 36,
      fechaRemate: 'vie 9 oct · 11:30',
      fechaPublicacion: 'el 22 sep 2026',
      riesgoGlobal: 'alto',
      tipo: 'Departamento',
      guardado: false
    },
    {
      id: 4,
      comuna: 'PROVIDENCIA',
      titulo: 'Oficina',
      precioMinimo: 95000000,
      precioM2: 1484400,
      superficie: 64,
      fechaRemate: 'mié 14 oct · 09:30',
      fechaPublicacion: 'hoy',
      riesgoGlobal: 'bajo',
      tipo: 'Oficina',
      guardado: true
    },
    {
      id: 5,
      comuna: 'MAIPÚ',
      titulo: 'Terreno Urbano Maipú',
      precioMinimo: 35000000,
      precioM2: 140000,
      superficie: 250,
      fechaRemate: 'mié 4 nov · 11:00',
      fechaPublicacion: 'el 27 sep 2026',
      riesgoGlobal: 'bajo',
      tipo: 'Terreno',
      guardado: false
    }
  ];

  propiedadesFiltradas: PropiedadItem[] = [...this.propiedades];

  filtrar() {
    const q = this.textoBusqueda.trim().toLowerCase();
    if (!q) {
      this.propiedadesFiltradas = [...this.propiedades];
      return;
    }
    this.propiedadesFiltradas = this.propiedades.filter(p =>
      p.comuna.toLowerCase().includes(q) ||
      p.titulo.toLowerCase().includes(q) ||
      p.tipo.toLowerCase().includes(q)
    );
  }

  toggleGuardar(prop: PropiedadItem, event: Event) {
    event.stopPropagation();
    prop.guardado = !prop.guardado;
  }

  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined || isNaN(valor)) return '$0';
    return '$' + valor.toLocaleString('es-CL');
  }
}