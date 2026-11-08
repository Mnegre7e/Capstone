import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiService, mensajeDeError } from './api.service';
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

  async recargar(): Promise<void> {
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
    await this.recargarFavoritos();
  }

  /** Guardar favoritos es parte del plan Premium: sin el plan no se piden. */
  private async recargarFavoritos(): Promise<void> {
    const usuario = this.sesion.usuario();
    if (!usuario?.acceso_completo) {
      return;
    }
    try {
      const lista = await this.api.get<{ property_id: string }[]>('/favoritos');
      this.favoritosDe.set({ de: usuario.id, ids: new Set(lista.map((f) => f.property_id)) });
    } catch {
      // si falla, se queda con los que tenía
    }
  }

  esFavorito(id: string): boolean {
    return this.favoritos().has(id);
  }

  /** Guarda o quita un favorito. El corazón cambia al tiro y, si la API falla, vuelve atrás. */
  async alternarFavorito(id: string): Promise<void> {
    const usuario = this.sesion.usuario();
    if (!usuario) {
      return;
    }
    const guardar = !this.esFavorito(id);
    const cambiar = (agregar: boolean) => {
      const ids = new Set(this.favoritos());
      if (agregar) {
        ids.add(id);
      } else {
        ids.delete(id);
      }
      this.favoritosDe.set({ de: usuario.id, ids });
    };
    cambiar(guardar);
    try {
      if (guardar) {
        await this.api.post(`/favoritos/${id}`, {});
      } else {
        await this.api.delete(`/favoritos/${id}`);
      }
    } catch (error) {
      cambiar(!guardar);
      throw error;
    }
  }
}
