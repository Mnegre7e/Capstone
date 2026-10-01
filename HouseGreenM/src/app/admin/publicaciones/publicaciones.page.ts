import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-publicaciones',
  templateUrl: './publicaciones.page.html',
  styleUrls: ['./publicaciones.page.scss'],
  standalone: false
})
export class PublicacionesPage {
  private router = inject(Router);

  isFiltrosOpen = false;
  opcionOrden = 'vistas';
  filtroGuardados = 'con_guardados';

  comunas = [
    { nombre: 'Santiago', selected: true },
    { nombre: 'Providencia', selected: true },
    { nombre: 'Maipú', selected: false },
    { nombre: 'La Florida', selected: false },
    { nombre: 'Estación Central', selected: false },
    { nombre: 'Ñuñoa', selected: false }
  ];

  publicaciones = [
    {
      id: 1,
      titulo: 'Departamento 2D 1B',
      comuna: 'Santiago Centro',
      vistas: 312,
      guardados: 28,
      riesgo: 'bajo',
      riesgoTexto: 'Bajo',
      tipoColor: 'verde',
      icono: 'business-outline'
    },
    {
      id: 2,
      titulo: 'Casa 3D 2B',
      comuna: 'Maipú',
      vistas: 241,
      guardados: 19,
      riesgo: 'medio',
      riesgoTexto: 'Medio',
      tipoColor: 'beige',
      icono: 'home-outline'
    },
    {
      id: 3,
      titulo: 'Oficina',
      comuna: 'Providencia',
      vistas: 188,
      guardados: 12,
      riesgo: 'bajo',
      riesgoTexto: 'Bajo',
      tipoColor: 'azul',
      icono: 'business-outline'
    },
    {
      id: 4,
      titulo: 'Departamento 1D 1B',
      comuna: 'Estación Central',
      vistas: 164,
      guardados: 7,
      riesgo: 'alto',
      riesgoTexto: 'Alto',
      tipoColor: 'beige',
      icono: 'business-outline'
    },
    {
      id: 5,
      titulo: 'Casa 4D 2B',
      comuna: 'La Florida',
      vistas: 115,
      guardados: 9,
      riesgo: 'medio',
      riesgoTexto: 'Medio',
      tipoColor: 'verde',
      icono: 'home-outline'
    }
  ];

  abrirFiltros() {
    this.isFiltrosOpen = true;
  }

  cerrarFiltros() {
    this.isFiltrosOpen = false;
  }

  limpiarFiltros() {
    this.opcionOrden = 'vistas';
    this.filtroGuardados = 'todas';
    this.comunas.forEach(c => c.selected = false);
  }

  verDetallePublicacion(id: number) {
    this.router.navigate(['/admin/publicaciones', id]);
  }

  irAPanel() {
    this.router.navigate(['/admin/admin-home']);
  }
}