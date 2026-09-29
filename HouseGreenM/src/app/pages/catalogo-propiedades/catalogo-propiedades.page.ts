import { Component, OnInit } from '@angular/core';

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
  tipo: 'Departamento' | 'Casa' | 'Oficina' | 'Terreno' | 'Local comercial';
  guardado: boolean;
}

@Component({
  selector: 'app-catalogo-propiedades',
  templateUrl: './catalogo-propiedades.page.html',
  styleUrls: ['./catalogo-propiedades.page.scss'],
  standalone: false
})
export class CatalogoPropiedadesPage implements OnInit {

  textoBusqueda: string = '';
  ordenSeleccionado: string = 'fecha';
  comunaSeleccionada: string = '';
  precioMaximo: number | null = null;
  tipoSeleccionado: string = '';
  riesgoSeleccionado: string = '';

  comunasDisponibles = ['Santiago Centro', 'Maipú', 'Estación Central', 'Providencia', 'Las Condes'];
  tiposDisponibles = ['Departamento', 'Casa', 'Oficina', 'Terreno'];

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
    }
  ];

  propiedadesFiltradas: PropiedadItem[] = [];

  ngOnInit() {
    this.aplicarFiltrosYOrden();
  }

  setRiesgo(valor: string) {
    this.riesgoSeleccionado = valor;
    this.aplicarFiltrosYOrden();
  }

  setComuna(valor: string) {
    this.comunaSeleccionada = valor;
    this.aplicarFiltrosYOrden();
  }

  setPrecio(valor: number | null) {
    this.precioMaximo = valor;
    this.aplicarFiltrosYOrden();
  }

  setTipo(valor: string) {
    this.tipoSeleccionado = valor;
    this.aplicarFiltrosYOrden();
  }

  setOrden(valor: string) {
    this.ordenSeleccionado = valor;
    this.aplicarFiltrosYOrden();
  }

  limpiarFiltros() {
    this.textoBusqueda = '';
    this.comunaSeleccionada = '';
    this.precioMaximo = null;
    this.tipoSeleccionado = '';
    this.riesgoSeleccionado = '';
    this.ordenSeleccionado = 'fecha';
    this.aplicarFiltrosYOrden();
  }

  getNombreOrden(): string {
    switch (this.ordenSeleccionado) {
      case 'precio-asc': return 'Precio: menor a mayor';
      case 'precio-desc': return 'Precio: mayor a menor';
      case 'superficie': return 'Superficie';
      case 'fecha':
      default: return 'Fecha de remate';
    }
  }

  aplicarFiltrosYOrden() {
    let res = [...(this.propiedades || [])];

    const q = (this.textoBusqueda || '').toString().trim().toLowerCase();
    if (q) {
      res = res.filter(p =>
        (p?.comuna || '').toLowerCase().includes(q) ||
        (p?.titulo || '').toLowerCase().includes(q)
      );
    }

    if (this.riesgoSeleccionado) {
      res = res.filter(p => p?.riesgoGlobal === this.riesgoSeleccionado);
    }

    if (this.comunaSeleccionada) {
      res = res.filter(p => (p?.comuna || '').toLowerCase().includes(this.comunaSeleccionada.toLowerCase()));
    }

    if (this.precioMaximo) {
      res = res.filter(p => (p?.precioMinimo || 0) <= (this.precioMaximo || Infinity));
    }

    if (this.tipoSeleccionado) {
      res = res.filter(p => p?.tipo === this.tipoSeleccionado);
    }

    switch (this.ordenSeleccionado) {
      case 'precio-asc':
        res.sort((a, b) => (a?.precioMinimo || 0) - (b?.precioMinimo || 0));
        break;
      case 'precio-desc':
        res.sort((a, b) => (b?.precioMinimo || 0) - (a?.precioMinimo || 0));
        break;
      case 'superficie':
        res.sort((a, b) => (b?.superficie || 0) - (a?.superficie || 0));
        break;
      case 'fecha':
      default:
        res.sort((a, b) => (a?.id || 0) - (b?.id || 0));
        break;
    }

    this.propiedadesFiltradas = res;
  }

  toggleGuardar(prop: PropiedadItem, event: Event) {
    if (event) event.stopPropagation();
    if (prop) prop.guardado = !prop.guardado;
  }

  formatearMoneda(valor: number): string {
    if (!valor) return '$0';
    return '$' + valor.toLocaleString('es-CL');
  }
}