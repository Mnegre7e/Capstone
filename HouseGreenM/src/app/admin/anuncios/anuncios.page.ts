import { Component, computed, inject, signal } from '@angular/core';

import { PublicacionAdmin, nombreComuna, plural } from '../../core/admin';
import { ApiService, mensajeDeError } from '../../core/api.service';
import { Opcion } from './elegir-opcion.component';

// Paso A9: los anuncios del administrador, igual que AdminAnunciosPage de la web (antes eran de ejemplo).
// Escribe un anuncio para todos los inversionistas, para una persona o para quienes vieron o guardaron una
// publicación, y si quiere también por correo. Les llega en Alertas (app y web). Abajo, los enviados.

type Audiencia = 'todos' | 'persona' | 'vieron' | 'guardaron';

interface Anuncio {
  id: string;
  title: string;
  message: string;
  audience: Audiencia;
  created_at: string;
  persona: string | null; // nombre de la persona, si fue para una sola
  publicacion: string | null; // título de la publicación, si fue para quienes la vieron o guardaron
  destinatarios: number;
  leidos: number;
  by_email: boolean; // si también se envió por correo
  emails_sent: number | null; // a cuántas personas les salió el correo (null = se está enviando)
}

interface Persona {
  id: string;
  full_name: string;
  email: string;
  role_name: string | null;
  is_active: boolean;
}

const AUDIENCIAS: { valor: Audiencia; nombre: string }[] = [
  { valor: 'todos', nombre: 'Todos los inversionistas' },
  { valor: 'persona', nombre: 'Una persona' },
  { valor: 'vieron', nombre: 'Quienes vieron una publicación' },
  { valor: 'guardaron', nombre: 'Quienes guardaron una publicación' },
];

const LARGO_MAXIMO_DEL_TITULO = 120;
const LARGO_MAXIMO_DEL_MENSAJE = 1000;
const POR_TANDA = 20; // cuántos anuncios enviados se muestran de una vez
const CADA_CUANTO_SE_REVISA = 4000; // mientras salen los correos, se vuelve a preguntar cada 4 segundos
const DIEZ_MINUTOS = 10 * 60 * 1000;

/** "6 oct 2026, 16:30" */
function fechaYHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function paraQuien(anuncio: Anuncio): string {
  if (anuncio.audience === 'todos') return 'Todos los inversionistas';
  if (anuncio.audience === 'persona') return anuncio.persona ?? 'Una persona (la cuenta ya no existe)';
  const accion = anuncio.audience === 'vieron' ? 'vieron' : 'guardaron';
  return anuncio.publicacion
    ? `Quienes ${accion} «${anuncio.publicacion}»`
    : `Quienes ${accion} una publicación que ya no existe`;
}

function textoDeLectura(anuncio: Anuncio): string {
  if (anuncio.destinatarios === 0) return 'Sin destinatarios (las cuentas ya no existen)';
  const cuantos = plural(anuncio.destinatarios, 'destinatario', 'destinatarios');
  if (anuncio.leidos === 0) return `${cuantos} · nadie lo ha leído todavía`;
  if (anuncio.leidos >= anuncio.destinatarios) {
    return `${cuantos} · ${anuncio.destinatarios === 1 ? 'ya lo leyó' : 'todos lo leyeron'}`;
  }
  return `${cuantos} · ${anuncio.leidos} lo ${anuncio.leidos === 1 ? 'leyó' : 'leyeron'}`;
}

function textoDelCorreo(anuncio: Anuncio): string {
  if (anuncio.emails_sent === null) return 'También por correo · enviándose...';
  if (anuncio.emails_sent >= anuncio.destinatarios) {
    return `También por correo · se envió a ${plural(anuncio.destinatarios, 'persona', 'personas')}`;
  }
  return (
    `También por correo · se envió a ${anuncio.emails_sent} de ${plural(anuncio.destinatarios, 'persona', 'personas')} ` +
    '(las otras direcciones son de prueba o no se pudieron enviar)'
  );
}

@Component({
  selector: 'app-anuncios',
  templateUrl: './anuncios.page.html',
  styleUrls: ['./anuncios.page.scss'],
  standalone: false,
})
export class AnunciosPage {
  private api = inject(ApiService);

  readonly AUDIENCIAS = AUDIENCIAS;
  readonly LARGO_MAXIMO_DEL_TITULO = LARGO_MAXIMO_DEL_TITULO;
  readonly LARGO_MAXIMO_DEL_MENSAJE = LARGO_MAXIMO_DEL_MENSAJE;

  readonly anuncios = signal<Anuncio[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly tanda = signal(POR_TANDA);

  private personas = signal<Persona[] | null>(null);
  private publicaciones = signal<PublicacionAdmin[] | null>(null);
  readonly errorDeListas = signal('');

  readonly para = signal<Audiencia>('todos');
  readonly persona = signal<Opcion | null>(null);
  readonly publicacion = signal<Opcion | null>(null);
  readonly titulo = signal('');
  readonly mensaje = signal('');
  readonly porCorreo = signal(false);

  readonly confirmando = signal(false); // se pregunta antes de enviar
  readonly enviando = signal(false);
  readonly errorDeEnvio = signal('');
  readonly aviso = signal(''); // "Anuncio enviado a 3 personas."

  private reloj: ReturnType<typeof setTimeout> | null = null;

  // Solo los inversionistas con la cuenta activa reciben anuncios
  readonly inversionistas = computed(
    () => this.personas()?.filter((p) => p.role_name === 'inversionista' && p.is_active) ?? null,
  );
  readonly textoTodos = computed(() => {
    const cantidad = this.inversionistas()?.length;
    if (cantidad === undefined) return '';
    if (cantidad === 0) return 'Todavía no hay inversionistas registrados.';
    if (cantidad === 1) return 'Lo recibirá el único inversionista registrado.';
    return `Lo recibirán los ${cantidad} inversionistas registrados.`;
  });
  readonly opcionesDePersonas = computed<Opcion[] | null>(
    () =>
      this.inversionistas()
        ?.map((p) => ({ id: p.id, titulo: p.full_name, detalle: p.email }))
        .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es')) ?? null,
  );
  // Las publicaciones que alguien vio (o guardó), de la que más tiene a la que menos
  readonly opcionesDePublicaciones = computed<Opcion[] | null>(() => {
    const vieron = this.para() === 'vieron';
    const cuenta = (p: PublicacionAdmin) => (vieron ? p.personas : p.guardados);
    return (
      this.publicaciones()
        ?.filter((p) => cuenta(p) > 0)
        .sort((a, b) => cuenta(b) - cuenta(a))
        .map((p) => ({
          id: p.id,
          titulo: p.title,
          detalle: vieron
            ? `${nombreComuna(p)} · ${plural(p.personas, 'persona la vio', 'personas la vieron')}`
            : `${nombreComuna(p)} · ${plural(p.guardados, 'persona la guardó', 'personas la guardaron')}`,
        })) ?? null
    );
  });

  readonly destinoEnPalabras = computed(() => {
    const para = this.para();
    if (para === 'todos') {
      const lista = this.inversionistas();
      return lista ? `los ${plural(lista.length, 'inversionista', 'inversionistas')}` : 'todos los inversionistas';
    }
    if (para === 'persona') return this.persona()?.titulo ?? '';
    return `quienes ${para === 'vieron' ? 'vieron' : 'guardaron'} «${this.publicacion()?.titulo ?? ''}»`;
  });

  readonly visibles = computed(() =>
    this.anuncios()
      .slice(0, this.tanda())
      .map((anuncio) => ({
        anuncio,
        fecha: fechaYHora(anuncio.created_at),
        para: paraQuien(anuncio),
        lectura: textoDeLectura(anuncio),
        correo: anuncio.by_email ? textoDelCorreo(anuncio) : null,
      })),
  );

  ionViewWillEnter() {
    void this.cargarAnuncios();
    const avisarError = (error: unknown) => this.errorDeListas.set(mensajeDeError(error));
    this.api.get<Persona[]>('/admin/usuarios').then((datos) => this.personas.set(datos), avisarError);
    this.api.get<PublicacionAdmin[]>('/admin/publicaciones').then((datos) => this.publicaciones.set(datos), avisarError);
  }

  ionViewDidLeave() {
    this.pararReloj();
  }

  private async cargarAnuncios() {
    try {
      this.anuncios.set(await this.api.get<Anuncio[]>('/admin/anuncios'));
      this.error.set(null);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
    this.revisarCorreos();
  }

  /** Mientras salen los correos de un anuncio recién enviado, se vuelve a preguntar cada 4 segundos. */
  private revisarCorreos() {
    this.pararReloj();
    const hayCorreosEnviandose = this.anuncios().some(
      (a) => a.by_email && a.emails_sent === null && Date.now() - Date.parse(a.created_at) < DIEZ_MINUTOS,
    );
    if (hayCorreosEnviandose) {
      this.reloj = setTimeout(() => void this.cargarAnuncios(), CADA_CUANTO_SE_REVISA);
    }
  }

  private pararReloj() {
    if (this.reloj !== null) {
      clearTimeout(this.reloj);
      this.reloj = null;
    }
  }

  elegirPara(valor: Audiencia) {
    this.para.set(valor);
    this.publicacion.set(null); // la publicación elegida puede no servir para la otra opción
    this.limpiarAvisos();
  }

  elegirPersona(opcion: Opcion | null) {
    this.persona.set(opcion);
    this.limpiarAvisos();
  }

  elegirPublicacion(opcion: Opcion | null) {
    this.publicacion.set(opcion);
    this.limpiarAvisos();
  }

  escribirTitulo(valor: string) {
    this.titulo.set(valor);
    this.limpiarAvisos();
  }

  escribirMensaje(valor: string) {
    this.mensaje.set(valor);
    this.limpiarAvisos();
  }

  cambiarCorreo(valor: boolean) {
    this.porCorreo.set(valor);
    this.limpiarAvisos();
  }

  private limpiarAvisos() {
    this.errorDeEnvio.set('');
    this.aviso.set('');
  }

  /** Antes de enviar se revisa que esté todo y se pregunta. */
  revisar() {
    this.aviso.set('');
    let problema = '';
    const para = this.para();
    if (para === 'persona' && !this.persona()) problema = 'Elige a la persona.';
    else if ((para === 'vieron' || para === 'guardaron') && !this.publicacion()) problema = 'Elige la publicación.';
    else if (this.titulo().trim() === '') problema = 'Escribe el título del anuncio.';
    else if (this.mensaje().trim() === '') problema = 'Escribe el mensaje del anuncio.';
    this.errorDeEnvio.set(problema);
    if (problema === '') this.confirmando.set(true);
  }

  async enviar() {
    this.enviando.set(true);
    this.errorDeEnvio.set('');
    const para = this.para();
    try {
      const enviado = await this.api.post<Anuncio>('/admin/anuncios', {
        title: this.titulo().trim(),
        message: this.mensaje().trim(),
        audience: para,
        target_user_id: para === 'persona' ? this.persona()?.id : null,
        property_id: para === 'vieron' || para === 'guardaron' ? this.publicacion()?.id : null,
        by_email: this.porCorreo(),
      });
      this.anuncios.update((actuales) => [enviado, ...actuales]); // el nuevo queda primero
      this.aviso.set(
        `Anuncio enviado a ${plural(enviado.destinatarios, 'persona', 'personas')}.` +
          (enviado.by_email ? ' Los correos se están enviando: el resultado aparece abajo en unos segundos.' : ''),
      );
      this.titulo.set('');
      this.mensaje.set('');
      this.porCorreo.set(false);
      this.persona.set(null);
      this.publicacion.set(null);
      this.revisarCorreos();
    } catch (error) {
      this.errorDeEnvio.set(mensajeDeError(error));
    } finally {
      this.enviando.set(false);
      this.confirmando.set(false);
    }
  }

  mostrarMas() {
    this.tanda.set(this.tanda() + POR_TANDA);
  }
}
