import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

interface Opinion {
  id: number;
  usuario: string;
  fecha: string;
  estrellas: number;
  categoria: string;
  comentario: string;
  autorizoRespuesta: boolean; // Agregado según diseño
  respondido: boolean;
  respuesta?: string;
}

@Component({
  selector: 'app-opiniones',
  templateUrl: './opiniones.page.html',
  styleUrls: ['./opiniones.page.scss'],
  standalone: false
})
export class OpinionesPage {
  private router = inject(Router);

  filtroActivo: string = 'todas';
  promedioGeneral: number = 4.3;
  totalOpiniones: number = 86;

  desgloseEstrellas = [
    { estrellas: 5, porcentaje: 55 },
    { estrellas: 4, porcentaje: 25 },
    { estrellas: 3, porcentaje: 10 },
    { estrellas: 2, porcentaje: 5 },
    { estrellas: 1, porcentaje: 5 }
  ];

  opiniones: Opinion[] = [
    {
      id: 1,
      usuario: 'Camila Rojas',
      fecha: 'vie 25 sep 2026 · 09:50',
      estrellas: 4,
      categoria: 'Semáforo',
      comentario: 'Me gustaría ver el historial de cambios del semáforo de cada propiedad.',
      autorizoRespuesta: true,
      respondido: false
    },
    {
      id: 2,
      usuario: 'Diego Fuentes',
      fecha: 'jue 24 sep 2026 · 18:20',
      estrellas: 5,
      categoria: 'Mapa',
      comentario: 'El filtro por comuna me ahorra mucho tiempo. Sería útil dibujar una zona en el mapa.',
      autorizoRespuesta: false,
      respondido: false
    }
  ];

  get opinionesFiltradas(): Opinion[] {
    if (this.filtroActivo === 'pendientes') {
      return this.opiniones.filter(o => !o.respondido);
    }
    if (this.filtroActivo === 'respondidas') {
      return this.opiniones.filter(o => o.respondido);
    }
    if (this.filtroActivo === 'sugerencias') {
      return this.opiniones.filter(o => o.categoria.toLowerCase() === 'sugerencia');
    }
    return this.opiniones;
  }

  setFiltro(filtro: string) {
    this.filtroActivo = filtro;
  }

  // Redirección a la vista responder-opinion
  responder(id: number) {
    this.router.navigate(['/responder-opinion'], { queryParams: { id } });
  }

  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}