import { Component, inject, signal } from '@angular/core';

import { ApiService, mensajeDeError } from '../../core/api.service';
import {
  LARGO_MAXIMO_DEL_MENSAJE,
  NOMBRE_CALIFICACION,
  Opinion,
  TEMAS,
  fechaConAnio,
  nombreDeTema,
} from '../../core/opiniones';

// Paso A7: "Opinar", igual que la página "Tu opinión" de la web (OpinionesPage). Antes era un formulario de ejemplo.
// La persona califica HouseGreen (1 a 5), elige un tema, deja un mensaje opcional y ve las opiniones que ha
// enviado, con las respuestas del equipo. Se guardan en la API: el administrador las ve y responde desde su panel.

type Aviso = { tipo: 'ok' | 'error'; texto: string } | null;

@Component({
  selector: 'app-contacto',
  templateUrl: './contacto.page.html',
  styleUrls: ['./contacto.page.scss'],
  standalone: false,
})
export class ContactoPage {
  private api = inject(ApiService);

  readonly TEMAS = TEMAS;
  readonly NOMBRE_CALIFICACION = NOMBRE_CALIFICACION;
  readonly LARGO_MAXIMO_DEL_MENSAJE = LARGO_MAXIMO_DEL_MENSAJE;
  readonly ESTRELLAS = [1, 2, 3, 4, 5];
  readonly nombreDeTema = nombreDeTema;
  readonly fechaConAnio = fechaConAnio;

  // Formulario
  readonly calificacion = signal(0); // 0 = todavía no elige
  readonly tema = signal('');
  readonly mensaje = signal('');
  readonly aceptaRespuesta = signal(false);
  readonly enviando = signal(false);
  readonly aviso = signal<Aviso>(null);

  // Opiniones ya enviadas
  readonly opiniones = signal<Opinion[]>([]);
  readonly cargando = signal(true);
  readonly errorDeCarga = signal('');

  async ionViewWillEnter() {
    // Se piden cada vez que se entra: así se ve la respuesta del equipo apenas llega
    try {
      this.opiniones.set(await this.api.get<Opinion[]>('/opiniones/mias'));
      this.errorDeCarga.set('');
    } catch (error) {
      this.errorDeCarga.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  elegirCalificacion(numero: number) {
    this.calificacion.set(numero);
    this.aviso.set(null);
  }

  elegirTema(valor: string) {
    this.tema.set(valor);
    this.aviso.set(null);
  }

  escribirMensaje(valor: string) {
    this.mensaje.set(valor);
    this.aviso.set(null);
  }

  async enviar() {
    this.aviso.set(null);
    if (this.calificacion() === 0) {
      this.aviso.set({ tipo: 'error', texto: 'Elige una calificación de 1 a 5 estrellas.' });
      return;
    }
    if (this.tema() === '') {
      this.aviso.set({ tipo: 'error', texto: 'Elige un tema.' });
      return;
    }

    this.enviando.set(true);
    try {
      const guardada = await this.api.post<Opinion>('/opiniones', {
        rating: this.calificacion(),
        topic: this.tema(),
        message: this.mensaje().trim(),
        allows_reply: this.aceptaRespuesta(),
      });
      // La opinión nueva queda primera en la lista y el formulario se limpia
      this.opiniones.update((actuales) => [guardada, ...actuales]);
      this.calificacion.set(0);
      this.tema.set('');
      this.mensaje.set('');
      this.aceptaRespuesta.set(false);
      this.aviso.set({ tipo: 'ok', texto: '¡Gracias! Recibimos tu opinión.' });
    } catch (error) {
      this.aviso.set({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      this.enviando.set(false);
    }
  }
}
