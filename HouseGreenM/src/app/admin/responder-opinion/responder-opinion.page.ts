import { Component, inject, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-responder-opinion',
  templateUrl: './responder-opinion.page.html',
  styleUrls: ['./responder-opinion.page.scss'],
  standalone: false
})
export class ResponderOpinionPage implements OnInit {
  private location = inject(Location);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  maxCaracteres = 1000;
  respuestaTexto: string = 'Hola Camila, gracias por la idea. Estamos trabajando en un historial del semáforo para cada propiedad y te avisaremos cuando esté disponible.';

  // Datos de la sugerencia/opinión
  opinionData = {
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
    autorizoRespuesta: true
  };

  ngOnInit() {
    // Si pasas datos por QueryParams o Estado, puedes cargarlos aquí
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        // Lógica opcional para cargar datos según ID
      }
    });
  }

  volver() {
    this.location.back();
  }

  verActividad() {
    console.log('Ver actividad del usuario:', this.opinionData.usuario.email);
    // Redirección a la vista de actividad del usuario si existe
  }

  enviarRespuesta() {
    if (!this.respuestaTexto.trim()) return;

    console.log('Enviando respuesta:', {
      opinionId: this.opinionData.id,
      respuesta: this.respuestaTexto
    });

    // Volver a la pantalla de opiniones
    this.location.back();
  }
}