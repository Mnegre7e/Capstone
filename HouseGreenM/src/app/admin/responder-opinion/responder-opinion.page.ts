import { Component, inject, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface UsuarioOpinion {
  nombre: string;
  email: string;
  iniciales: string;
}

interface OpinionDetalle {
  id: number;
  usuario: UsuarioOpinion;
  fechaRecepcion: string;
  estrellas: number;
  calificacionTexto: string;
  categoria: string;
  mensaje: string;
  autorizoRespuesta: boolean;
  respuestaPrevia?: string;
}

@Component({
  selector: 'app-responder-opinion',
  templateUrl: './responder-opinion.page.html',
  styleUrls: ['./responder-opinion.page.scss'],
  standalone: false
})
export class ResponderOpinionPage implements OnInit {
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  opinionId!: number;
  maxCaracteres: number = 1000;
  respuestaTexto: string = '';

  // Mock con las 2 opiniones de la pantalla
  private opinionesMock: OpinionDetalle[] = [
    {
      id: 1,
      usuario: {
        nombre: 'Camila Rojas',
        email: 'camila.rojas@ejemplo.cl',
        iniciales: 'CR'
      },
      fechaRecepcion: 'vie 25 sep 2026 · 09:50',
      estrellas: 4,
      calificacionTexto: 'Muy buena',
      categoria: 'Semáforo',
      mensaje: 'Me gustaría ver el historial de cambios del semáforo de cada propiedad.',
      autorizoRespuesta: true,
      respuestaPrevia: 'Hola Camila, gracias por la idea. Estamos trabajando en un historial del semáforo para cada propiedad y te avisaremos cuando esté disponible.'
    },
    {
      id: 2,
      usuario: {
        nombre: 'Diego Fuentes',
        email: 'diego.fuentes@ejemplo.cl',
        iniciales: 'DF'
      },
      fechaRecepcion: 'jue 24 sep 2026 · 18:20',
      estrellas: 5,
      calificacionTexto: 'Excelente',
      categoria: 'Mapa',
      mensaje: 'El filtro por comuna me ahorra mucho tiempo. Sería útil dibujar una zona en el mapa.',
      autorizoRespuesta: true,
      respuestaPrevia: 'Hola Diego, ¡muchas gracias! Excelente idea, estamos analizando sumar la herramienta de dibujo sobre el mapa.'
    }
  ];

  // Objeto de la opinión seleccionada (inicializado por defecto con el primero)
  opinionData: OpinionDetalle = this.opinionesMock[0];

  ngOnInit() {
    // Captura el :id de la URL (/responder-opinion/1 o /responder-opinion/2)
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.opinionId = Number(idParam);
      this.cargarOpinion(this.opinionId);
    }
  }

  cargarOpinion(id: number) {
    const encontrada = this.opinionesMock.find(o => o.id === id);
    if (encontrada) {
      this.opinionData = encontrada;
      this.respuestaTexto = encontrada.respuestaPrevia || '';
    }
  }

  volver() {
    this.location.back();
  }

  verActividad() {
    console.log('Ver actividad de:', this.opinionData.usuario.email);
  }

  enviarRespuesta() {
    if (!this.respuestaTexto.trim()) return;

    console.log(`Respuesta enviada para la opinión #${this.opinionId} (${this.opinionData.usuario.nombre}):`, {
      destino: this.opinionData.usuario.email,
      respuesta: this.respuestaTexto
    });

    this.location.back();
  }
}