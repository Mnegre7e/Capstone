import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

interface Publicacion {
  id: number;
  titulo: string;
  comuna: string;
  vistas: number;
  guardados: number;
  nivelRiesgo: 'Bajo' | 'Medio' | 'Alto';
  tipoIcono: 'dept' | 'casa' | 'oficina';
}

@Component({
  selector: 'app-publicaciones',
  templateUrl: './publicaciones.page.html',
  styleUrls: ['./publicaciones.page.scss'],
  standalone: false
})
export class PublicacionesPage {
  private router = inject(Router);

  // Estados de filtro y búsqueda
  comunaSeleccionada: string = 'Todas';
  ordenSeleccionado: string = 'mas-vistas';
  textoBusqueda: string = '';
  mostrarBuscador: boolean = false;

  // Lista de comunas disponibles para el filtro
  comunas: string[] = ['Todas', 'Santiago Centro', 'Maipú', 'Providencia', 'Estación Central', 'Las Condes'];

  // Datos de prueba
  publicaciones: Publicacion[] = [
    { id: 1, titulo: 'Departamento 2D 1B', comuna: 'Santiago Centro', vistas: 312, guardados: 28, nivelRiesgo: 'Bajo', tipoIcono: 'dept' },
    { id: 2, titulo: 'Casa 3D 2B', comuna: 'Maipú', vistas: 241, guardados: 19, nivelRiesgo: 'Medio', tipoIcono: 'casa' },
    { id: 3, titulo: 'Oficina', comuna: 'Providencia', vistas: 188, guardados: 12, nivelRiesgo: 'Bajo', tipoIcono: 'oficina' },
    { id: 4, titulo: 'Departamento 1D 1B', comuna: 'Estación Central', vistas: 164, guardados: 7, nivelRiesgo: 'Alto', tipoIcono: 'dept' }
  ];

  // Getter con la lógica de filtrado y ordenamiento dinámico
  get publicacionesFiltradas(): Publicacion[] {
    return this.publicaciones
      .filter(pub => {
        // Filtro por comuna
        const cumpleComuna = this.comunaSeleccionada === 'Todas' || pub.comuna === this.comunaSeleccionada;
        
        // Filtro por texto de búsqueda
        const texto = this.textoBusqueda.toLowerCase().trim();
        const cumpleTexto = !texto || 
          pub.titulo.toLowerCase().includes(texto) || 
          pub.comuna.toLowerCase().includes(texto);

        return cumpleComuna && cumpleTexto;
      })
      .sort((a, b) => {
        // Ordenamiento
        if (this.ordenSeleccionado === 'mas-vistas') {
          return b.vistas - a.vistas;
        } else if (this.ordenSeleccionado === 'mas-guardados') {
          return b.guardados - a.guardados;
        }
        return 0;
      });
  }

  // Navegación al detalle
verDetalle(id: number) {
  this.router.navigate(['publicacion-detalle', id]);
}

  // Alternar barra de búsqueda
  toggleBuscador() {
    this.mostrarBuscador = !this.mostrarBuscador;
    if (!this.mostrarBuscador) {
      this.textoBusqueda = '';
    }
  }
  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}