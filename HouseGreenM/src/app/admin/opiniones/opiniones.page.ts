import { Component, computed, inject, signal } from '@angular/core';

import { ApiService, mensajeDeError } from '../../core/api.service';
import { Opinion, TEMAS, fechaConAnio, nombreDeTema } from '../../core/opiniones';

// Paso A9: las opiniones para el administrador, igual que AdminOpinionesPage de la web (antes eran de ejemplo).
// Ve todas las opiniones (GET /admin/opiniones), con el promedio, y responde a quienes lo autorizaron.
// La respuesta le llega a la persona en "Opinar" (app y web).

interface OpinionAdmin extends Opinion {
  user_name: string;
  user_email: string;
}

type Vista = 'todas' | 'por_responder' | 'respondidas';

const POR_TANDA = 20; // cuántas opiniones se muestran de una vez
const LARGO_MAXIMO_DE_LA_RESPUESTA = 1000;

function esperaRespuesta(opinion: OpinionAdmin): boolean {
  return opinion.allows_reply && opinion.replies.length === 0;
}

@Component({
  selector: 'app-opiniones',
  templateUrl: './opiniones.page.html',
  styleUrls: ['./opiniones.page.scss'],
  standalone: false,
})
export class OpinionesPage {
  private api = inject(ApiService);

  readonly TEMAS = TEMAS;
  readonly ESTRELLAS = [1, 2, 3, 4, 5];
  readonly CALIFICACIONES = [5, 4, 3, 2, 1];
  readonly LARGO_MAXIMO_DE_LA_RESPUESTA = LARGO_MAXIMO_DE_LA_RESPUESTA;
  readonly nombreDeTema = nombreDeTema;
  readonly fechaConAnio = fechaConAnio;

  readonly opiniones = signal<OpinionAdmin[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly vista = signal<Vista>('todas');
  readonly tema = signal(''); // vacío = todos
  readonly calificacion = signal(0); // 0 = todas
  readonly tanda = signal(POR_TANDA);

  readonly respondiendo = signal<string | null>(null); // id de la opinión
  readonly texto = signal('');
  readonly enviando = signal(false);
  readonly errorDeRespuesta = signal('');

  // Resumen: promedio y cuántas hay de cada calificación
  readonly resumen = computed(() => {
    const lista = this.opiniones();
    const porCalificacion: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let suma = 0;
    for (const opinion of lista) {
      porCalificacion[opinion.rating] += 1;
      suma += opinion.rating;
    }
    const promedio = lista.length > 0 ? Math.round((suma / lista.length) * 10) / 10 : null;
    const mayor = Math.max(1, ...Object.values(porCalificacion));
    return {
      total: lista.length,
      promedio,
      promedioTexto: promedio?.toLocaleString('es-CL', { minimumFractionDigits: 1 }) ?? '',
      estrellasPromedio: Math.round(promedio ?? 0),
      barras: this.CALIFICACIONES.map((numero) => ({
        numero,
        cantidad: porCalificacion[numero],
        ancho: `${(porCalificacion[numero] / mayor) * 100}%`,
      })),
      porResponder: lista.filter(esperaRespuesta).length,
      respondidas: lista.filter((o) => o.replies.length > 0).length,
    };
  });

  readonly pestanas = computed(() => {
    const resumen = this.resumen();
    return [
      { valor: 'todas' as Vista, texto: `Todas · ${resumen.total}` },
      { valor: 'por_responder' as Vista, texto: `Por responder · ${resumen.porResponder}` },
      { valor: 'respondidas' as Vista, texto: `Respondidas · ${resumen.respondidas}` },
    ];
  });

  readonly filtradas = computed(() =>
    this.opiniones().filter(
      (o) =>
        (this.vista() === 'todas' ||
          (this.vista() === 'por_responder' && esperaRespuesta(o)) ||
          (this.vista() === 'respondidas' && o.replies.length > 0)) &&
        (this.tema() === '' || o.topic === this.tema()) &&
        (this.calificacion() === 0 || o.rating === this.calificacion()),
    ),
  );
  readonly visibles = computed(() => this.filtradas().slice(0, this.tanda()));

  async ionViewWillEnter() {
    // Se piden cada vez que se entra: así se ve la opinión que acaba de llegar
    try {
      const datos = await this.api.get<{ items: OpinionAdmin[] }>('/admin/opiniones');
      this.opiniones.set(datos.items);
      this.error.set(null);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  // Al cambiar un filtro se vuelve a la primera tanda
  elegirVista(valor: Vista) {
    this.vista.set(valor);
    this.tanda.set(POR_TANDA);
  }

  elegirTema(valor: string) {
    this.tema.set(valor);
    this.tanda.set(POR_TANDA);
  }

  elegirCalificacion(valor: string | number) {
    this.calificacion.set(Number(valor));
    this.tanda.set(POR_TANDA);
  }

  mostrarMas() {
    this.tanda.set(this.tanda() + POR_TANDA);
  }

  abrirRespuesta(id: string) {
    this.respondiendo.set(id);
    this.texto.set('');
    this.errorDeRespuesta.set('');
  }

  escribir(valor: string) {
    this.texto.set(valor);
    this.errorDeRespuesta.set('');
  }

  async responder(id: string) {
    this.errorDeRespuesta.set('');
    if (this.texto().trim() === '') {
      this.errorDeRespuesta.set('Escribe la respuesta.');
      return;
    }
    this.enviando.set(true);
    try {
      const actualizada = await this.api.post<OpinionAdmin>(`/admin/opiniones/${id}/respuesta`, {
        message: this.texto().trim(),
      });
      this.opiniones.update((actuales) => actuales.map((o) => (o.id === id ? actualizada : o)));
      this.respondiendo.set(null);
      this.texto.set('');
    } catch (error) {
      this.errorDeRespuesta.set(mensajeDeError(error));
    } finally {
      this.enviando.set(false);
    }
  }
}
