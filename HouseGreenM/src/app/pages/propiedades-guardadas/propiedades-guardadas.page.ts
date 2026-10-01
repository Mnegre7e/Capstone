import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

export interface PropiedadGuardada {
  id: number;
  titulo: string;
  comuna: string;
  tipo: string;
  precioMinimo: number;
  diasRestantes: number;
  fechaRemate: string;
  riesgo: 'bajo' | 'medio' | 'alto';
}

@Component({
  selector: 'app-propiedades-guardadas',
  templateUrl: './propiedades-guardadas.page.html',
  styleUrls: ['./propiedades-guardadas.page.scss'],
  standalone: false
})
export class PropiedadesGuardadasPage {

  private router = inject(Router);
  private location = inject(Location);

  propiedades: PropiedadGuardada[] = [
    {
      id: 1,
      titulo: 'Depto. 2D 1B · Santiago Centro',
      comuna: 'Santiago',
      tipo: 'Departamento',
      precioMinimo: 42000000,
      diasRestantes: 7,
      fechaRemate: 'vie 2 oct',
      riesgo: 'bajo'
    },
    {
      id: 2,
      titulo: 'Casa 3D 2B · Maipú',
      comuna: 'Maipú',
      tipo: 'Casa',
      precioMinimo: 65000000,
      diasRestantes: 12,
      fechaRemate: 'mié 7 oct',
      riesgo: 'medio'
    },
    {
      id: 3,
      titulo: 'Departamento 1D 1B · Providencia',
      comuna: 'Providencia',
      tipo: 'Departamento',
      precioMinimo: 58000000,
      diasRestantes: 15,
      fechaRemate: 'sáb 10 oct',
      riesgo: 'bajo'
    }
  ];

  mostrarModalEliminar: boolean = false;
  propiedadAEliminar: PropiedadGuardada | null = null;

  goBack() {
    this.location.back();
  }

  solicitarEliminar(prop: PropiedadGuardada, event: Event) {
    event.stopPropagation();
    this.propiedadAEliminar = prop;
    this.mostrarModalEliminar = true;
  }

  confirmarEliminar() {
    if (this.propiedadAEliminar) {
      this.propiedades = this.propiedades.filter(p => p.id !== this.propiedadAEliminar?.id);
      this.cerrarModal();
    }
  }

  cerrarModal() {
    this.mostrarModalEliminar = false;
    this.propiedadAEliminar = null;
  }

  verDetalle(prop: PropiedadGuardada) {
    this.router.navigate(['/detalle-propiedad', prop.id]);
  }

  formatearMoneda(valor: number): string {
    if (!valor) return '$0';
    return '$' + valor.toLocaleString('es-CL');
  }
}