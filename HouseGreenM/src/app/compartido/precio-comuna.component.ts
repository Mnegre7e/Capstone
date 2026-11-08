import { Component, computed, effect, inject, input, signal } from '@angular/core';

import { ApiService } from '../core/api.service';
import { Riesgo, pesos } from '../core/remates';

// Paso A3: el precio mínimo del remate frente al precio típico de su comuna (igual a la web).
// 40 % o más bajo = 2 puntos · entre 15 % y 39,9 % = 1 punto · menos de 15 % = 0 puntos.
interface Comparacion {
  disponible: boolean;
  motivo: string | null;
  etiqueta: string | null;
  comuna: string | null;
  precio_minimo_clp: string | null;
  precio_tipico_clp: string | null;
  precio_tipico_uf: string | null;
  avisos: number | null;
  superficie_tipica_m2: string | null;
  descuento_pct: number | null;
  zona: Riesgo | null;
  fuente: string | null;
  fuente_url: string | null;
  fecha: string | null;
}

const PUNTOS: Record<Riesgo, string> = { verde: '2 puntos', amarillo: '1 punto', rojo: '0 puntos' };

function numero(valor: string | number | null): string {
  return Number(valor ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 1 });
}

@Component({
  selector: 'app-precio-comuna',
  standalone: false,
  templateUrl: './precio-comuna.component.html',
  styleUrls: ['./precio-comuna.component.scss'],
})
export class PrecioComunaComponent {
  private api = inject(ApiService);

  readonly remateId = input.required<string>();
  readonly datos = signal<Comparacion | null>(null);

  constructor() {
    effect(() => {
      void this.cargar(this.remateId());
    });
  }

  private async cargar(id: string) {
    try {
      this.datos.set(await this.api.get<Comparacion>(`/propiedades/${id}/precio`));
    } catch {
      this.datos.set(null); // si falla, la sección no aparece
    }
  }

  readonly comparable = computed(() => {
    const d = this.datos();
    return Boolean(d && d.disponible && d.zona && d.descuento_pct !== null);
  });
  readonly tipo = computed(() => (this.datos()?.etiqueta ?? 'propiedades').toLowerCase());
  readonly resultado = computed(() => {
    const descuento = this.datos()?.descuento_pct ?? 0;
    return descuento >= 0 ? `${numero(descuento)} % bajo el precio típico` : `${numero(-descuento)} % sobre el precio típico`;
  });
  readonly puntos = computed(() => {
    const zona = this.datos()?.zona;
    return zona ? PUNTOS[zona] : '';
  });

  pesos(valor: string | null): string {
    return pesos(Number(valor ?? 0));
  }

  numero(valor: string | number | null): string {
    return numero(valor);
  }

  /** "2026-11-01" -> "1 nov 2026" (armada a mano para que no cambie de día por la zona horaria) */
  fechaCorta(texto: string): string {
    const [anio, mes, dia] = texto.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
