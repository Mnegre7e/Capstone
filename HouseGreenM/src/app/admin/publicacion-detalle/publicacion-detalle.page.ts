import { Component, inject, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router'; // 1. Importar ActivatedRoute

@Component({
  selector: 'app-publicacion-detalle',
  templateUrl: './publicacion-detalle.page.html',
  styleUrls: ['./publicacion-detalle.page.scss'],
  standalone: false
})
export class PublicacionDetallePage implements OnInit {
  private location = inject(Location);
  private router = inject(Router);
  private route = inject(ActivatedRoute); // 2. Inyectar ActivatedRoute

  tabActiva: 'vieron' | 'guardaron' = 'vieron';

  // Base de datos de prueba compartida para el detalle
  private publicacionesMock = [
    { id: 1, titulo: 'Departamento 2D 1B', comuna: 'Santiago Centro', fechaRemate: 'vie 2 oct', vistasUnicas: 187, vistasTotales: 312, guardadosTotales: 28, riesgo: 'Bajo' },
    { id: 2, titulo: 'Casa 3D 2B', comuna: 'Maipú', fechaRemate: 'lun 5 oct', vistasUnicas: 140, vistasTotales: 241, guardadosTotales: 19, riesgo: 'Medio' },
    { id: 3, titulo: 'Oficina', comuna: 'Providencia', fechaRemate: 'mié 7 oct', vistasUnicas: 110, vistasTotales: 188, guardadosTotales: 12, riesgo: 'Bajo' },
    { id: 4, titulo: 'Departamento 1D 1B', comuna: 'Estación Central', fechaRemate: 'jue 8 oct', vistasUnicas: 95, vistasTotales: 164, guardadosTotales: 7, riesgo: 'Alto' }
  ];

  // Objeto de la propiedad que se mostrará en pantalla
  propiedad = this.publicacionesMock[0];

  // Datos para la pestaña "La vieron"
  usuariosVieron = [
    { id: 1, nombre: 'Camila Rojas', iniciales: 'CR', tiempo: 'hoy 09:42', visitas: 3, guardo: true },
    { id: 2, nombre: 'Diego Fuentes', iniciales: 'DF', tiempo: 'hoy 08:10', visitas: 2, guardo: true },
    { id: 3, nombre: 'Ignacio Paredes', iniciales: 'IP', tiempo: 'ayer 22:05', visitas: 1, guardo: false },
    { id: 4, nombre: 'Valentina Soto', iniciales: 'VS', tiempo: 'ayer 19:30', visitas: 4, guardo: true },
    { id: 5, nombre: 'Tomás Herrera', iniciales: 'TH', tiempo: 'mié 23 sep', visitas: 1, guardo: false }
  ];

  // Datos para la pestaña "La guardaron"
  usuariosGuardaron = [
    { id: 1, nombre: 'Camila Rojas', iniciales: 'CR', fechaGuardado: '19 sep', visitas: 3 },
    { id: 2, nombre: 'Diego Fuentes', iniciales: 'DF', fechaGuardado: '22 sep', visitas: 2 },
    { id: 3, nombre: 'Valentina Soto', iniciales: 'VS', fechaGuardado: '23 sep', visitas: 4 },
    { id: 4, nombre: 'Martina Vega', iniciales: 'MV', fechaGuardado: '24 sep', visitas: 1 },
    { id: 5, nombre: 'Joaquín Díaz', iniciales: 'JD', fechaGuardado: '25 sep', visitas: 2 }
  ];

  ngOnInit() {
    // 3. Capturar el 'id' enviado por la ruta
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const idBuscado = Number(idParam);
      const encontrada = this.publicacionesMock.find(p => p.id === idBuscado);
      if (encontrada) {
        this.propiedad = encontrada;
      }
    }
  }

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