import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { ApiService, mensajeDeError } from './api.service';
import { ROL_ANALISTA } from './modelos';
import { Comuna, Remate } from './remates';
import { SesionService } from './sesion.service';

// Paso A2: el catálogo y los favoritos de la persona, compartidos por las pantallas de la app.
// Igual que la web: el catálogo y las comunas se piden juntos, y se vuelven a pedir (en silencio)
// cada vez que se abre el catálogo.

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private api = inject(ApiService);
  private sesion = inject(SesionService);

  readonly remates = signal<Remate[]>([]);
  readonly comunasPorId = signal<Record<number, string>>({});
  readonly cargando = signal(true); // solo la primera vez
  readonly error = signal<string | null>(null);

  // Los favoritos se guardan junto con de quién son: al cambiar de cuenta no se ven los de la anterior
  private favoritosDe = signal<{ de: string; ids: Set<string> } | null>(null);
  readonly favoritos = computed(() => {
    const datos = this.favoritosDe();
    return datos && datos.de === this.sesion.usuario()?.id ? datos.ids : new Set<string>();
  });

  // Paso A9f: para los clics seguidos sobre el mismo corazón (igual que la web, FavoritesProvider):
  private enCurso = new Set<string>(); // remates con un pedido a la API sin responder
  private deseado = new Map<string, boolean>(); // cómo quiere la persona que quede cada uno (true = guardado)

  constructor() {
    // Paso A9f: como en la web, los favoritos se piden apenas alguien entra, sin esperar al catálogo
    // (antes llegaban después de todos los remates, unos segundos más tarde, y parecía que no se habían guardado)
    let anterior: string | null = null;
    effect(() => {
      const id = this.sesion.usuario()?.id ?? null;
      if (id === anterior) {
        return;
      }
      anterior = id;
      this.enCurso.clear();
      this.deseado.clear();
      if (id !== null) {
        untracked(() => void this.recargarFavoritos());
      }
    });
  }

  /** Pide los remates, las comunas y los favoritos (los favoritos van en paralelo, no al final). */
  async recargar(): Promise<void> {
    await Promise.all([this.recargarCatalogo(), this.recargarFavoritos()]);
  }

  private async recargarCatalogo(): Promise<void> {
    try {
      const [remates, comunas] = await Promise.all([
        this.api.get<Remate[]>('/propiedades'),
        this.api.get<Comuna[]>('/comunas'),
      ]);
      const porId: Record<number, string> = {};
      for (const comuna of comunas) {
        porId[comuna.id] = comuna.name;
      }
      this.remates.set(remates);
      this.comunasPorId.set(porId);
      this.error.set(null);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * Pide la lista real de favoritos a la API. Como en la web, se piden aunque el plan Premium haya vencido
   * (la persona sigue viendo su lista). Devuelve false si no se pudo.
   */
  private async recargarFavoritos(): Promise<boolean> {
    const usuario = this.sesion.usuario();
    if (!usuario || usuario.role_id === ROL_ANALISTA) {
      return true;
    }
    try {
      const lista = await this.api.get<{ property_id: string }[]>('/favoritos');
      if (this.sesion.usuario()?.id !== usuario.id) {
        return true; // cambió de cuenta mientras llegaba la lista
      }
      const ids = new Set(lista.map((f) => f.property_id));
      // Los clics que todavía se están guardando mandan sobre la lista que llegó
      for (const [id, quiere] of this.deseado) {
        if (quiere) {
          ids.add(id);
        } else {
          ids.delete(id);
        }
      }
      this.favoritosDe.set({ de: usuario.id, ids });
      return true;
    } catch {
      return false; // si falla, se queda con los que tenía
    }
  }

  /** Cambia la lista de favoritos de la cuenta conectada. */
  private cambiarFavoritos(usuarioId: string, cambio: (ids: Set<string>) => void): void {
    const datos = this.favoritosDe();
    const ids = new Set(datos && datos.de === usuarioId ? datos.ids : []);
    cambio(ids);
    this.favoritosDe.set({ de: usuarioId, ids });
  }

  esFavorito(id: string): boolean {
    return this.favoritos().has(id);
  }

  /**
   * Guarda o quita un favorito, igual que la web: el corazón cambia al tiro; si se toca varias veces seguidas,
   * los pedidos a la API van de a uno y en orden (antes podían llegar desordenados y la base quedaba distinta
   * de la pantalla). Si la API falla, se vuelve a pedir la lista real.
   */
  async alternarFavorito(id: string): Promise<void> {
    const usuario = this.sesion.usuario();
    if (!usuario) {
      return;
    }
    // 1. Cómo debe quedar después de este clic: lo contrario de como estaba
    const guardar = !(this.deseado.get(id) ?? this.favoritos().has(id));
    this.deseado.set(id, guardar);
    this.cambiarFavoritos(usuario.id, (ids) => {
      if (guardar) {
        ids.add(id);
      } else {
        ids.delete(id);
      }
    });

    // 2. Si la API todavía no responde un clic anterior sobre este remate, no se manda otro pedido:
    //    el que está en curso revisa al terminar si la persona cambió de idea
    if (this.enCurso.has(id)) {
      return;
    }
    this.enCurso.add(id);

    // 3. Se le avisa a la API, y se repite solo si mientras tanto hubo más clics
    let enLaBase = !guardar; // lo que tenía la base antes de este clic
    try {
      while (this.deseado.get(id) !== enLaBase) {
        const objetivo = this.deseado.get(id) === true;
        if (objetivo) {
          await this.api.post(`/favoritos/${id}`, {});
        } else {
          await this.api.delete(`/favoritos/${id}`);
        }
        enLaBase = objetivo;
      }
    } catch (error) {
      // 4. La pantalla no debe mostrar algo falso: se vuelve a pedir la lista real
      this.deseado.delete(id);
      const pudo = await this.recargarFavoritos();
      if (!pudo) {
        // Sin conexión: se deja como estaba en la base
        this.cambiarFavoritos(usuario.id, (ids) => {
          if (enLaBase) {
            ids.add(id);
          } else {
            ids.delete(id);
          }
        });
      }
      throw error;
    } finally {
      this.enCurso.delete(id);
      this.deseado.delete(id);
    }
  }
}
