import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rut?: string;
  iniciales: string;
  vistas: number;
  guardados: number;
  ultimaActividad: string;
  esNuevo?: boolean;
  activoEstaSemana?: boolean;
}

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  standalone: false
})
export class UsuariosPage {
  private router = inject(Router);

  busqueda: string = '';
  filtroActivo: string = 'todos';
  totalUsuarios: number = 248;
  nuevosEstaSemana: number = 23;

  usuarios: Usuario[] = [
    {
      id: 1,
      nombre: 'Camila Rojas',
      email: 'camila.rojas@ejemplo.cl',
      iniciales: 'CR',
      vistas: 14,
      guardados: 3,
      ultimaActividad: 'activa hoy',
      activoEstaSemana: true
    },
    {
      id: 2,
      nombre: 'Diego Fuentes',
      email: 'diego.fuentes@ejemplo.cl',
      iniciales: 'DF',
      vistas: 22,
      guardados: 5,
      ultimaActividad: 'activo hoy',
      activoEstaSemana: true
    },
    {
      id: 3,
      nombre: 'Valentina Soto',
      email: 'valentina.soto@ejemplo.cl',
      iniciales: 'VS',
      vistas: 9,
      guardados: 1,
      ultimaActividad: 'activa ayer',
      activoEstaSemana: true
    },
    {
      id: 4,
      nombre: 'Ignacio Paredes',
      email: 'ignacio.paredes@ejemplo.cl',
      iniciales: 'IP',
      vistas: 31,
      guardados: 6,
      ultimaActividad: 'mié 23 sep',
      activoEstaSemana: true
    },
    {
      id: 5,
      nombre: 'Martina Vega',
      email: 'martina.vega@ejemplo.cl',
      iniciales: 'MV',
      vistas: 7,
      guardados: 2,
      ultimaActividad: 'mar 22 sep',
      activoEstaSemana: true
    },
    {
      id: 6,
      nombre: 'Tomás Herrera',
      email: 'tomas.herrera@ejemplo.cl',
      iniciales: 'TH',
      vistas: 12,
      guardados: 2,
      ultimaActividad: 'dom 20 sep',
      esNuevo: true
    },
    {
      id: 7,
      nombre: 'Francisca Muñoz',
      email: 'francisca.munoz@ejemplo.cl',
      iniciales: 'FM',
      vistas: 4,
      guardados: 0,
      ultimaActividad: 'lun 21 sep',
      esNuevo: true
    }
  ];

  get usuariosFiltrados(): Usuario[] {
    return this.usuarios.filter(user => {
      const texto = this.busqueda.toLowerCase().trim();
      const coincideBusqueda = !texto || 
        user.nombre.toLowerCase().includes(texto) || 
        user.email.toLowerCase().includes(texto) ||
        (user.rut && user.rut.toLowerCase().includes(texto));

      let coincideFiltro = true;
      if (this.filtroActivo === 'activos') {
        coincideFiltro = !!user.activoEstaSemana;
      } else if (this.filtroActivo === 'nuevos') {
        coincideFiltro = !!user.esNuevo;
      }

      return coincideBusqueda && coincideFiltro;
    });
  }

  setFiltro(filtro: string) {
    this.filtroActivo = filtro;
  }

  verActividad(id: number) {
    this.router.navigate(['/actividad-usuario', id]);
  }
}