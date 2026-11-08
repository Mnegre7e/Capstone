import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { PublicacionAdmin, estadoPublicacion, fechaDelRemate, nombreComuna, plural, textoZona } from '../../core/admin';
import { ApiService, mensajeDeError } from '../../core/api.service';

// Paso A9: el detalle de una publicación para el administrador, igual que AdminPublicacionDetallePage de la web
// (antes tenía datos de ejemplo): quiénes la vieron y la guardaron, la descripción, y quitarla del catálogo
// o volver a publicarla. Todo se guarda en la API: si se quita aquí, desaparece también del catálogo de la web.

interface PersonaQueLaVio {
  user_id: string;
  full_name: string;
  email: string;
  visitas: number;
  ultima_visita: string;
  la_guardo: boolean;
}

interface PersonaQueLaGuardo {
  user_id: string;
  full_name: string;
  email: string;
  guardada_el: string;
  visitas: number;
}

interface PublicacionDetalle extends PublicacionAdmin {
  description: string | null;
  la_vieron: PersonaQueLaVio[];
  la_guardaron: PersonaQueLaGuardo[];
}

type Pestana = 'vieron' | 'guardaron';

const LARGO_MAXIMO_DEL_MOTIVO = 300;

/** "Ana Pérez" -> "AP" */
function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join('');
}

/** "hoy 14:05", "ayer 09:30" o "lun 2 nov". */
function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  const hora = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  const hoy = new Date();
  const soloDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diasAtras = Math.round((soloDia(hoy) - soloDia(fecha)) / 86_400_000);
  if (diasAtras === 0) return `hoy ${hora}`;
  if (diasAtras === 1) return `ayer ${hora}`;
  return fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

@Component({
  selector: 'app-publicacion-detalle',
  templateUrl: './publicacion-detalle.page.html',
  styleUrls: ['./publicacion-detalle.page.scss'],
  standalone: false,
})
export class PublicacionDetallePage {
  private ruta = inject(ActivatedRoute);
  private api = inject(ApiService);

  readonly LARGO_MAXIMO_DEL_MOTIVO = LARGO_MAXIMO_DEL_MOTIVO;
  readonly plural = plural;
  readonly iniciales = iniciales;
  readonly formatearFecha = formatearFecha;

  readonly id = signal('');
  readonly detalle = signal<PublicacionDetalle | null>(null);
  readonly error = signal<string | null>(null);
  readonly pestana = signal<Pestana>('vieron');
  private fotoFallo = signal(false);

  readonly quitando = signal(false); // se está mostrando el formulario para quitarla
  readonly motivo = signal('');
  readonly guardando = signal(false);
  readonly errorAccion = signal<string | null>(null);

  readonly estado = computed(() => {
    const detalle = this.detalle();
    return detalle ? estadoPublicacion(detalle) : 'vigente';
  });
  readonly foto = computed(() => {
    const url = this.detalle()?.image_url;
    return url && !this.fotoFallo() ? this.api.urlDeArchivo(url) : null;
  });
  readonly zona = computed(() => {
    const detalle = this.detalle();
    return detalle ? textoZona(detalle) : '';
  });
  readonly comunaYTipo = computed(() => {
    const detalle = this.detalle();
    return detalle ? `${nombreComuna(detalle)} · ${detalle.property_type}` : '';
  });
  readonly datosDelRemate = computed(() => {
    const detalle = this.detalle();
    if (!detalle) return '';
    return (
      `${detalle.address ?? 'Sin dirección informada'} · ` +
      (detalle.auction_date ? `Remate: ${fechaDelRemate(detalle.auction_date)}` : 'Sin fecha de remate')
    );
  });
  readonly avisoTerminado = computed(() => {
    const detalle = this.detalle();
    if (!detalle) return '';
    if (this.estado() === 'retirada') return 'El sitio de origen retiró este remate.';
    return `Este remate ya se realizó${detalle.auction_date ? ` el ${fechaDelRemate(detalle.auction_date)}` : ''}.`;
  });
  readonly quitadaEl = computed(() => {
    const removida = this.detalle()?.removed_at;
    return removida ? fechaDelRemate(removida) : '';
  });

  async ionViewWillEnter() {
    // Se pide cada vez que se entra: así se ve la descripción o las fotos recién editadas
    this.id.set(this.ruta.snapshot.paramMap.get('id') ?? '');
    try {
      this.detalle.set(await this.api.get<PublicacionDetalle>(`/admin/publicaciones/${this.id()}`));
      this.fotoFallo.set(false);
      this.error.set(null);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  marcarFotoFallida() {
    this.fotoFallo.set(true);
  }

  /** Sacarla del catálogo (por ejemplo, una propiedad de prueba). No se borra. */
  async quitar() {
    this.guardando.set(true);
    this.errorAccion.set(null);
    try {
      const nuevo = await this.api.post<{ removed_at: string | null }>(`/admin/publicaciones/${this.id()}/quitar`, {
        motivo: this.motivo().trim(),
      });
      this.detalle.update((actual) => (actual ? { ...actual, removed_at: nuevo.removed_at } : actual));
      this.quitando.set(false);
      this.motivo.set('');
    } catch (error) {
      this.errorAccion.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  async volverAPublicar() {
    this.guardando.set(true);
    this.errorAccion.set(null);
    try {
      await this.api.post(`/admin/publicaciones/${this.id()}/volver-a-publicar`);
      this.detalle.update((actual) => (actual ? { ...actual, removed_at: null } : actual));
    } catch (error) {
      this.errorAccion.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  cancelarQuitar() {
    this.quitando.set(false);
    this.errorAccion.set(null);
  }
}
