import { Component, computed, effect, inject, input, signal } from '@angular/core';

import { ApiService } from '../core/api.service';
import { pesos } from '../core/remates';

// Paso A3: datos del remate leídos de la ficha del sitio de origen (igual a la web).
// Si el remate no los tiene, la sección no aparece.
interface DatosDelRemate {
  origin: string | null;
  court: string | null;
  case_number: string | null;
  modality: string | null;
  place: string | null;
  guarantee_amount: string | null;
  guarantee_text: string | null;
  payment_method: string | null;
  payment_term: string | null;
  requirements: string | null;
  conditions: string | null;
  announcement: string | null;
  observations: string | null;
  source_url: string | null;
}

@Component({
  selector: 'app-datos-remate',
  standalone: false,
  templateUrl: './datos-remate.component.html',
  styleUrls: ['./datos-remate.component.scss'],
})
export class DatosRemateComponent {
  private api = inject(ApiService);

  readonly remateId = input.required<string>();
  readonly datos = signal<DatosDelRemate | null>(null);

  constructor() {
    effect(() => {
      void this.cargar(this.remateId());
    });
  }

  private async cargar(id: string) {
    try {
      this.datos.set(await this.api.get<DatosDelRemate | null>(`/propiedades/${id}/remate`));
    } catch {
      this.datos.set(null);
    }
  }

  // Casillas con los datos cortos: solo los que existen
  readonly casillas = computed(() => {
    const r = this.datos();
    const lista: { etiqueta: string; valor: string }[] = [];
    if (!r) return lista;
    if (r.court) lista.push({ etiqueta: 'Tribunal', valor: r.court });
    if (r.case_number) lista.push({ etiqueta: 'Rol de la causa', valor: r.case_number });
    if (r.modality) lista.push({ etiqueta: 'Modalidad', valor: r.modality });
    if (r.place) lista.push({ etiqueta: 'Lugar', valor: r.place });
    if (r.guarantee_amount) lista.push({ etiqueta: 'Garantía', valor: pesos(Number(r.guarantee_amount)) });
    if (r.payment_method) lista.push({ etiqueta: 'Forma de pago', valor: r.payment_method });
    if (r.payment_term) lista.push({ etiqueta: 'Plazo para pagar', valor: r.payment_term });
    if (r.origin) lista.push({ etiqueta: 'Origen', valor: r.origin });
    return lista;
  });

  // Textos largos, cada uno con su título
  readonly textos = computed(() => {
    const r = this.datos();
    const lista: { titulo: string; texto: string }[] = [];
    if (!r) return lista;
    if (r.guarantee_text) lista.push({ titulo: 'Cómo se entrega la garantía', texto: r.guarantee_text });
    if (r.requirements) lista.push({ titulo: 'Requisitos para participar', texto: r.requirements });
    if (r.conditions) lista.push({ titulo: 'Condiciones', texto: r.conditions });
    if (r.observations) lista.push({ titulo: 'Observaciones', texto: r.observations });
    return lista;
  });
}
