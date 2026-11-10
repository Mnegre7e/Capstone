import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { ApiService, mensajeDeError } from './api.service';
import { ROL_ADMIN, ROL_ANALISTA } from './modelos';
import { SesionService } from './sesion.service';

// Paso A7: los avisos de la persona, igual que AlertsProvider y AnunciosProvider de la web:
// - los remates que calzan con sus alertas (GET /alertas)
// - los anuncios del equipo (GET /anuncios; el administrador los envía, no los recibe)
// El número rojo junto a "Alertas" en el menú suma los dos sin leer.
// Paso A21: ese número se mantiene al día sin tener que entrar a Alertas (antes solo se actualizaba al entrar).

const MILISEGUNDOS_ENTRE_REVISIONES = 60_000; // cada cuánto se revisa si llegó algo nuevo
const SEGUNDOS_DE_REVISION = 10; // cuánto se espera a la API en cada revisión

/** Un remate que calzó con una alerta. */
export interface Notificacion {
  id: string;
  property_id: string | null; // null si la propiedad ya no existe
  property_title: string | null;
  alert_type: string; // "cambio_semaforo" = bajó su nivel de riesgo; si no, es un remate nuevo
  message: string;
  is_read: boolean;
  created_at: string;
}

/** Un anuncio del equipo de HouseGreen. */
export interface AnuncioRecibido {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null; // null = todavía no lo lee
  property_id: string | null; // si el anuncio es sobre una publicación
  publicacion: string | null; // título de esa publicación
}

@Injectable({ providedIn: 'root' })
export class AvisosService {
  private api = inject(ApiService);
  private sesion = inject(SesionService);

  readonly notificaciones = signal<Notificacion[]>([]);
  readonly cargandoNotificaciones = signal(false);
  readonly errorNotificaciones = signal<string | null>(null);

  readonly anuncios = signal<AnuncioRecibido[]>([]);
  readonly cargandoAnuncios = signal(false);
  readonly errorAnuncios = signal<string | null>(null);

  readonly noLeidas = computed(() => this.notificaciones().filter((n) => !n.is_read).length);
  readonly anunciosSinLeer = computed(() => this.anuncios().filter((a) => a.read_at === null).length);
  readonly pendientes = computed(() => this.noLeidas() + this.anunciosSinLeer());
  private revisando = false; // Paso A21: evita dos revisiones al mismo tiempo

  // Quién recibe qué: el analista no tiene alertas; el administrador no recibe anuncios
  private recibeAlertas = computed(() => {
    const rol = this.sesion.usuario()?.role_id;
    return rol !== undefined && rol !== ROL_ANALISTA;
  });
  readonly recibeAnuncios = computed(() => {
    const rol = this.sesion.usuario()?.role_id;
    return rol !== undefined && rol !== ROL_ANALISTA && rol !== ROL_ADMIN;
  });

  constructor() {
    // Al entrar (o cambiar de cuenta) se piden; al salir se borran los de la cuenta anterior
    let anterior: string | null = null;
    effect(() => {
      const id = this.sesion.usuario()?.id ?? null;
      if (id === anterior) {
        return;
      }
      anterior = id;
      this.notificaciones.set([]);
      this.anuncios.set([]);
      if (id !== null) {
        untracked(() => void this.recargar()); // lo que se lee al pedir no hace volver a correr este efecto
      }
    });

    // Paso A21: se revisa cada minuto (solo con la app a la vista) y apenas se vuelve a la app.
    // Al abrir el menú también se revisa (app.component.html).
    const revisarSiSeVe = () => {
      if (document.visibilityState === 'visible') {
        void this.revisar();
      }
    };
    const cadaMinuto = setInterval(revisarSiSeVe, MILISEGUNDOS_ENTRE_REVISIONES);
    document.addEventListener('visibilitychange', revisarSiSeVe);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(cadaMinuto);
      document.removeEventListener('visibilitychange', revisarSiSeVe);
    });
  }

  /** Vuelve a pedir los avisos (se llama al abrir la pantalla Alertas). */
  async recargar(): Promise<void> {
    await Promise.all([this.recargarNotificaciones(), this.recargarAnuncios()]);
  }

  /**
   * Paso A21: revisa si llegó algo nuevo, para el número rojo del menú. A diferencia de recargar(), no muestra
   * "Cargando..." ni errores en la pantalla Alertas: si la API no contesta, se queda con lo que tenía.
   */
  async revisar(): Promise<void> {
    const id = this.sesion.usuario()?.id;
    if (id === undefined || this.revisando) {
      return;
    }
    this.revisando = true;
    const notificacionesAntes = this.notificaciones();
    const anunciosAntes = this.anuncios();
    try {
      const [notificaciones, anuncios] = await Promise.all([
        this.recibeAlertas()
          ? this.api.get<Notificacion[]>('/alertas', SEGUNDOS_DE_REVISION).catch(() => null)
          : Promise.resolve(null),
        this.recibeAnuncios()
          ? this.api.get<AnuncioRecibido[]>('/anuncios', SEGUNDOS_DE_REVISION).catch(() => null)
          : Promise.resolve(null),
      ]);
      // Si mientras tanto se cambió de cuenta, o la lista cambió (por ejemplo, se marcó algo como leído),
      // esta respuesta ya quedó vieja: no se usa y se espera la próxima revisión
      if (this.sesion.usuario()?.id !== id) {
        return;
      }
      if (notificaciones && this.notificaciones() === notificacionesAntes) {
        this.notificaciones.set(notificaciones);
        this.errorNotificaciones.set(null);
      }
      if (anuncios && this.anuncios() === anunciosAntes) {
        this.anuncios.set(anuncios);
        this.errorAnuncios.set(null);
      }
    } finally {
      this.revisando = false;
    }
  }

  private async recargarNotificaciones() {
    if (!this.recibeAlertas()) {
      return;
    }
    this.cargandoNotificaciones.set(true);
    try {
      this.notificaciones.set(await this.api.get<Notificacion[]>('/alertas'));
      this.errorNotificaciones.set(null);
    } catch (error) {
      this.errorNotificaciones.set(mensajeDeError(error));
    } finally {
      this.cargandoNotificaciones.set(false);
    }
  }

  private async recargarAnuncios() {
    if (!this.recibeAnuncios()) {
      return;
    }
    this.cargandoAnuncios.set(true);
    try {
      this.anuncios.set(await this.api.get<AnuncioRecibido[]>('/anuncios'));
      this.errorAnuncios.set(null);
    } catch (error) {
      this.errorAnuncios.set(mensajeDeError(error));
    } finally {
      this.cargandoAnuncios.set(false);
    }
  }

  /** Marca un aviso como leído: cambia al tiro y, si la API falla, se vuelve a pedir la lista. */
  marcarLeida(id: string): void {
    const aviso = this.notificaciones().find((n) => n.id === id);
    if (!aviso || aviso.is_read) {
      return;
    }
    this.notificaciones.update((lista) => lista.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    this.api.patch(`/alertas/${id}/leida`).catch(() => this.recargarNotificaciones());
  }

  marcarTodasLeidas(): void {
    this.notificaciones.update((lista) => lista.map((n) => ({ ...n, is_read: true })));
    this.api.post('/alertas/leidas').catch(() => this.recargarNotificaciones());
  }

  marcarAnuncioLeido(id: string): void {
    const anuncio = this.anuncios().find((a) => a.id === id);
    if (!anuncio || anuncio.read_at !== null) {
      return;
    }
    const ahora = new Date().toISOString();
    this.anuncios.update((lista) => lista.map((a) => (a.id === id ? { ...a, read_at: ahora } : a)));
    this.api.patch(`/anuncios/${id}/leido`).catch(() => this.recargarAnuncios());
  }
}
