import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

interface Opinion {
  id: number;
  usuario: string;
  fecha: string;
  estrellas: number;
  categoria: string;
  comentario: string;
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

  // Filtro activo
  filtroActivo: string = 'todas';

  // Resumen de valoraciones
  promedioGeneral: number = 4.3;
  totalOpiniones: number = 28;
  desgloseEstrellas = [
    { estrellas: 5, porcentaje: 65 },
    { estrellas: 4, porcentaje: 20 },
    { estrellas: 3, porcentaje: 10 },
    { estrellas: 2, porcentaje: 3 },
    { estrellas: 1, porcentaje: 2 }
  ];

  // Lista de opiniones
  opiniones: Opinion[] = [
    {
      id: 1,
      usuario: 'Camila Silva',
      fecha: 'Ayer 18:40',
      estrellas: 5,
      categoria: 'Atención',
      comentario: 'Excelente proceso de remate, todo fue muy claro y transparente desde la primera vista.',
      respondido: true,
      respuesta: '¡Muchas gracias por tu comentario Camila! Seguimos mejorando la experiencia.'
    },
    {
      id: 2,
      usuario: 'Mateo González',
      fecha: '25 sep',
      estrellas: 3,
      categoria: 'Sugerencia',
      comentario: 'Estaría genial que agregaran más fotos de la cocina y el estacionamiento en las publicaciones.',
      respondido: false
    },
    {
      id: 3,
      usuario: 'Valentina Rojas',
      fecha: '22 sep',
      estrellas: 5,
      categoria: 'Proceso',
      comentario: 'La aplicación funciona muy bien para guardar y hacer seguimiento a las propiedades de mi interés.',
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

  responder(id: number) {
    this.router.navigate(['/responder-sugerencia', id]);
  }

  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}