import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-publicacion-detalle',
  templateUrl: './publicacion-detalle.page.html',
  styleUrls: ['./publicacion-detalle.page.scss'],
  standalone: false
})
export class PublicacionDetallePage {
  private location = inject(Location);
  private router = inject(Router);

  tabActiva: 'vieron' | 'guardaron' = 'vieron';

  propiedad = {
    id: 1,
    titulo: 'Departamento 2D 1B',
    comuna: 'Santiago Centro',
    fechaRemate: 'vie 2 oct',
    vistasUnicas: 187,
    vistasTotales: 312,
    guardadosTotales: 28,
    riesgo: 'bajo'
  };

  // Datos para la pestaña "La vieron" (Imagen 04)
  usuariosVieron = [
    { id: 1, nombre: 'Camila Rojas', iniciales: 'CR', tiempo: 'hoy 09:42', visitas: 3, guardo: true },
    { id: 2, nombre: 'Diego Fuentes', iniciales: 'DF', tiempo: 'hoy 08:10', visitas: 2, guardo: true },
    { id: 3, nombre: 'Ignacio Paredes', iniciales: 'IP', tiempo: 'ayer 22:05', visitas: 1, guardo: false },
    { id: 4, nombre: 'Valentina Soto', iniciales: 'VS', tiempo: 'ayer 19:30', visitas: 4, guardo: true },
    { id: 5, nombre: 'Tomás Herrera', iniciales: 'TH', tiempo: 'mié 23 sep', visitas: 1, guardo: false }
  ];

  // Datos para la pestaña "La guardaron" (Imagen 05)
  usuariosGuardaron = [
    { id: 1, nombre: 'Camila Rojas', iniciales: 'CR', fechaGuardado: '19 sep', visitas: 3 },
    { id: 2, nombre: 'Diego Fuentes', iniciales: 'DF', fechaGuardado: '22 sep', visitas: 2 },
    { id: 3, nombre: 'Valentina Soto', iniciales: 'VS', fechaGuardado: '23 sep', visitas: 4 },
    { id: 4, nombre: 'Martina Vega', iniciales: 'MV', fechaGuardado: '24 sep', visitas: 1 },
    { id: 5, nombre: 'Joaquín Díaz', iniciales: 'JD', fechaGuardado: '25 sep', visitas: 2 }
  ];

  volver() {
    this.location.back();
  }

  editarPublicacion() {
    console.log('Editar publicación', this.propiedad.id);
  }

  enviarAnuncio() {
    console.log(`Enviar anuncio a quienes la ${this.tabActiva}`);
  }
}