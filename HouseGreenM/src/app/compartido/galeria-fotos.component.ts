import { Component, computed, effect, inject, input, signal } from '@angular/core';

import { ApiService } from '../core/api.service';
import { VISOR_DE_GOOGLE } from './vista-calle.component';

interface Foto {
  id: string;
  url: string;
  label: string | null;
  position: number; // 0 = portada
}

// Respuesta de GET /propiedades/{id}/vista-calle (pasos 135 y 135c)
interface VistaCalleRespuesta {
  disponible: boolean;
  tipo: 'calle' | 'mapa' | null;
  url: string | null;
  motivo: string | null;
}

// Lo que se puede ver en grande: la foto fija de la calle (paso 135e), el visor de Google (vista de calle o mapa,
// pasos 135b y 135c) o una foto subida por el admin. url = dirección de la imagen o del visor; etiqueta solo en las fotos.
interface Cuadro {
  tipo: 'foto-calle' | 'calle' | 'mapa' | 'foto';
  url: string;
  etiqueta: string | null;
}

// Paso A3: la galería del detalle (igual a la web): foto grande con flechas y miniaturas.
// Sin fotos subidas, la imagen del remate o, si tampoco tiene, el dibujo según su tipo.
// Paso 135b: si hay vista de calle, es la FOTO PRINCIPAL (primer cuadro) y las fotos del admin van después.
// Paso 135c: si no tenemos el número, en su lugar va un mapa de Google con la dirección publicada.
// Paso 135e: la FOTO PRINCIPAL es la misma foto de la calle de la tarjeta del catálogo; después, la vista de calle
// que se puede girar (o el mapa) y las fotos del admin. Si Google no tiene esa foto, se salta.
@Component({
  selector: 'app-galeria-fotos',
  standalone: false,
  templateUrl: './galeria-fotos.component.html',
  styleUrls: ['./galeria-fotos.component.scss'],
})
export class GaleriaFotosComponent {
  private api = inject(ApiService);

  readonly remateId = input.required<string>();
  readonly imagenRespaldo = input<string | null>(null);
  readonly titulo = input('');
  readonly tipo = input('');
  readonly fotoCalle = input<string | null>(null);

  private fotoCalleFallida = signal<string | null>(null);

  readonly fotos = signal<Foto[]>([]);
  readonly visor = signal<{ tipo: 'calle' | 'mapa'; url: string } | null>(null);
  readonly actual = signal(0);

  /** La nota que va bajo el visor de Google, según sea vista de calle o mapa. */
  notaDe(tipo: string): string {
    if (tipo === 'foto-calle') {
      return (
        'Foto de calle referencial de Google: puede ser de hace algunos años y, en un edificio, muestra la fachada, ' +
        'no la unidad que se remata.'
      );
    }
    return tipo === 'mapa'
      ? 'Ubicación referencial: Google busca la dirección publicada en el remate. Confirma la dirección exacta en la ' +
          'publicación original antes de ofertar.'
      : 'Vista de calle referencial de Google: puede ser de hace algunos años y, en un edificio, muestra la fachada, ' +
          'no la unidad que se remata. Puedes girarla y acercarte.';
  }

  readonly cuadros = computed<Cuadro[]>(() => {
    const visor = this.visor();
    const fotoCalle = this.fotoCalle();
    return [
      ...(fotoCalle && fotoCalle !== this.fotoCalleFallida()
        ? [{ tipo: 'foto-calle' as const, url: fotoCalle, etiqueta: null }]
        : []),
      ...(visor ? [{ tipo: visor.tipo, url: visor.url, etiqueta: null }] : []),
      ...this.fotos().map((foto) => ({ tipo: 'foto' as const, url: foto.url, etiqueta: foto.label })),
    ];
  });

  /** Posición del cuadro grande (por si la vista de calle llega después de las fotos). */
  readonly posicion = computed(() => Math.min(this.actual(), Math.max(this.cuadros().length - 1, 0)));
  readonly cuadro = computed<Cuadro | null>(() => this.cuadros()[this.posicion()] ?? null);

  constructor() {
    // Cada vez que cambia el remate, se piden sus fotos y su vista de calle
    effect(() => {
      const id = this.remateId();
      void this.cargar(id);
      void this.cargarCalle(id);
    });
  }

  private async cargar(id: string) {
    this.actual.set(0);
    try {
      this.fotos.set(await this.api.get<Foto[]>(`/propiedades/${id}/fotos`));
    } catch {
      this.fotos.set([]); // si falla, se muestra la imagen de respaldo
    }
  }

  private async cargarCalle(id: string) {
    try {
      const r = await this.api.get<VistaCalleRespuesta>(`/propiedades/${id}/vista-calle`);
      this.visor.set(
        r.disponible && r.url?.startsWith(VISOR_DE_GOOGLE) ? { tipo: r.tipo === 'mapa' ? 'mapa' : 'calle', url: r.url } : null,
      );
    } catch {
      this.visor.set(null); // si falla, se ve la foto de siempre
    }
  }

  /** Google no tiene esa foto (o se llegó al tope del día): se salta y se ve lo que sigue. */
  fotoCalleNoCargo(url: string) {
    this.fotoCalleFallida.set(url);
  }

  url(direccion: string): string {
    return this.api.urlDeArchivo(direccion);
  }

  // El % hace que después del último vuelva al primero (y al revés)
  anterior() {
    const total = this.cuadros().length;
    this.actual.set((this.posicion() - 1 + total) % total);
  }

  siguiente() {
    this.actual.set((this.posicion() + 1) % this.cuadros().length);
  }
}
