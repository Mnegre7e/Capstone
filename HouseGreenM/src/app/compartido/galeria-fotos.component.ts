import { Component, effect, inject, input, signal } from '@angular/core';

import { ApiService } from '../core/api.service';

interface Foto {
  id: string;
  url: string;
  label: string | null;
  position: number; // 0 = portada
}

// Paso A3: la galería del detalle (igual a la web): foto grande con flechas y miniaturas.
// Sin fotos subidas, la imagen del remate o, si tampoco tiene, el dibujo según su tipo.
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

  readonly fotos = signal<Foto[]>([]);
  readonly actual = signal(0);

  constructor() {
    // Cada vez que cambia el remate, se piden sus fotos
    effect(() => {
      void this.cargar(this.remateId());
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

  url(direccion: string): string {
    return this.api.urlDeArchivo(direccion);
  }

  // El % hace que después de la última vuelva a la primera (y al revés)
  anterior() {
    const total = this.fotos().length;
    this.actual.set((this.actual() - 1 + total) % total);
  }

  siguiente() {
    this.actual.set((this.actual() + 1) % this.fotos().length);
  }
}
