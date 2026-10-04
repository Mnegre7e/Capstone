import { Component, inject, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-nuevo-anuncio',
  templateUrl: './nuevo-anuncio.page.html',
  styleUrls: ['./nuevo-anuncio.page.scss'],
  standalone: false
})
export class NuevoAnuncioPage implements OnInit {
  private location = inject(Location);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  modoDestinatario: 'todos' | 'personalizado' = 'personalizado';
  modoTiempo: 'ahora' | 'programar' = 'ahora';

  formAnuncio = {
    titulo: 'Nuevas fotos y bases del remate',
    mensaje: 'Subimos 3 fotos nuevas y las bases del remate del vie 2 oct. La inscripción cierra el jue 1 oct a las 12:00.',
    notifApp: true,
    correo: true
  };

  audienciaConfigured = {
    textoGrupo: 'Quienes vieron una publicación',
    propiedadTitulo: 'Departamento 2D 1B',
    propiedadComuna: 'Santiago Centro',
    personas: 187
  };

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['conteo']) {
        this.audienciaConfigured.personas = Number(params['conteo']);
        if (params['sub'] === 'guardaron') {
          this.audienciaConfigured.textoGrupo = 'Quienes guardaron una publicación';
        } else if (params['tipo'] === 'todos') {
          this.modoDestinatario = 'todos';
        }
      }
    });
  }

  cerrar() {
    this.location.back();
  }

  cambiarDestinatarios() {
    this.router.navigate(['/anuncio-destinatario']);
  }

  enviarAnuncio() {
    console.log('Enviando anuncio:', {
      ...this.formAnuncio,
      audiencia: this.audienciaConfigured
    });
    this.location.back();
  }
}