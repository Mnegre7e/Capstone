import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage {
  private router = inject(Router);

  usuarioNombre: string = 'Camila';
  rematesActivos: number = 36;
  notificacionesCount: number = 3;
  busqueda: string = '';

  semaforo = {
    bajo: 12,
    medio: 18,
    alto: 6
  };

  rematanPronto = [
    {
      id: 1,
      titulo: 'Departamento 2D 1B',
      comuna: 'Santiago Centro',
      m2: 48,
      precio: 42000000,
      fecha: 'vie 2 oct · 10:00',
      diasRestantes: 'En 7 días',
      riesgo: 'bajo'
    },
    {
      id: 2,
      titulo: 'Casa 3D 2B',
      comuna: 'Maipú',
      m2: 92,
      precio: 65000000,
      fecha: 'mié 7 oct · 11:30',
      diasRestantes: 'En 12 días',
      riesgo: 'medio'
    }
  ];

  recienPublicados = [
    {
      id: 3,
      titulo: 'Oficina',
      comuna: 'Providencia',
      m2: 64,
      precio: 95000000,
      tiempo: 'Hoy',
      riesgo: 'bajo',
      icono: 'business-outline'
    },
    {
      id: 4,
      titulo: 'Terreno',
      comuna: 'Puente Alto',
      m2: 250,
      precio: 35000000,
      tiempo: 'Ayer',
      riesgo: 'medio',
      icono: 'image-outline'
    }
  ];

  buscar() {
    this.router.navigate(['/catalogo-propiedades'], {
      queryParams: { q: this.busqueda }
    });
  }

  filtrarPorRiesgo(riesgo: string) {
    this.router.navigate(['/catalogo-propiedades'], {
      queryParams: { riesgo }
    });
  }

  irANotificaciones() {
    this.router.navigate(['/alertas']);
  }

  verDetalle(id: number) {
    this.router.navigate(['/detalle-remate', id]);
  }
}