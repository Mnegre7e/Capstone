import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PROPIEDADES_CATALOGO, Propiedad } from '../data/propiedades_data';

@Component({
  selector: 'app-catalogo-propiedades',
  templateUrl: './catalogo-propiedades.page.html',
  styleUrls: ['./catalogo-propiedades.page.scss'],
  standalone: false
})
export class CatalogoPropiedadesPage implements OnInit {

  // Inyección moderna con inject()
  private router = inject(Router);

  textoBusqueda: string = '';
  ordenSeleccionado: string = 'fecha';
  comunaSeleccionada: string = '';
  precioMaximo: number | null = null;
  tipoSeleccionado: string = '';
  riesgoSeleccionado: string = '';

  comunasDisponibles: string[] = ['Santiago Centro', 'Maipú', 'Estación Central', 'Providencia'];
  tiposDisponibles: string[] = ['Departamento', 'Casa', 'Oficina', 'Terreno'];

  propiedades: Propiedad[] = PROPIEDADES_CATALOGO;
  propiedadesFiltradas: Propiedad[] = [];

  constructor() {}

  ngOnInit() {
    this.aplicarFiltrosYOrden();
  }

  verDetallePropiedad(prop: Propiedad) {
    this.router.navigate(['/detalle-propiedad', prop.id]);
  }

  setRiesgo(valor: string) {
    this.riesgoSeleccionado = this.riesgoSeleccionado === valor ? '' : valor;
    this.aplicarFiltrosYOrden();
  }

  setComuna(valor: string) {
    this.comunaSeleccionada = this.comunaSeleccionada === valor ? '' : valor;
    this.aplicarFiltrosYOrden();
  }

  setPrecio(valor: number | null) {
    this.precioMaximo = this.precioMaximo === valor ? null : valor;
    this.aplicarFiltrosYOrden();
  }

  setTipo(valor: string) {
    this.tipoSeleccionado = this.tipoSeleccionado === valor ? '' : valor;
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

  aplicarFiltrosYOrden() {
    let res = [...this.propiedades];

    const q = (this.textoBusqueda || '').toLowerCase().trim();
    if (q) {
      res = res.filter(p =>
        p.comuna.toLowerCase().includes(q) ||
        p.titulo.toLowerCase().includes(q) ||
        p.direccion.toLowerCase().includes(q)
      );
    }

    if (this.riesgoSeleccionado) {
      res = res.filter(p => p.riesgoGlobal === this.riesgoSeleccionado);
    }

    if (this.comunaSeleccionada) {
      res = res.filter(p => p.comuna.toLowerCase().includes(this.comunaSeleccionada.toLowerCase()));
    }

    if (this.precioMaximo) {
      res = res.filter(p => p.precioMinimo <= (this.precioMaximo || Infinity));
    }

    if (this.tipoSeleccionado) {
      res = res.filter(p => p.tipo === this.tipoSeleccionado);
    }

    switch (this.ordenSeleccionado) {
      case 'precio-asc':
        res.sort((a, b) => a.precioMinimo - b.precioMinimo);
        break;
      case 'precio-desc':
        res.sort((a, b) => b.precioMinimo - a.precioMinimo);
        break;
      case 'superficie':
        res.sort((a, b) => b.superficie - a.superficie);
        break;
      case 'fecha':
      default:
        res.sort((a, b) => a.id - b.id);
        break;
    }

    this.propiedadesFiltradas = res;
  }

  toggleGuardar(prop: Propiedad, event: Event) {
    event.stopPropagation();
    prop.guardado = !prop.guardado;
  }

  formatearMoneda(valor: number): string {
    if (!valor) return '$0';
    return '$' + valor.toLocaleString('es-CL');
  }
}