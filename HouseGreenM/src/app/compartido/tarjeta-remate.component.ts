import { Component, computed, inject, input, output, signal } from '@angular/core';

import { ApiService } from '../core/api.service';
import {
  Remate,
  pesos,
  remateFinalizado,
  remateRetirado,
  textoPublicado,
  textoRemate,
} from '../core/remates';

// Paso A2: la tarjeta de un remate, igual a la de la web: foto (o dibujo), semáforo (solo Premium),
// corazón de favorito, comuna, título, dirección, precio mínimo, datos y fecha del remate.
@Component({
  selector: 'app-tarjeta-remate',
  standalone: false,
  templateUrl: './tarjeta-remate.component.html',
  styleUrls: ['./tarjeta-remate.component.scss'],
})
export class TarjetaRemateComponent {
  private api = inject(ApiService);

  readonly remate = input.required<Remate>();
  readonly comuna = input<string>('');
  readonly conPremium = input(false); // el semáforo (incluso el color) es solo para Premium
  readonly favorito = input(false);
  readonly alternarFavorito = output<void>();

  // Si la foto no carga, se recuerda cuál falló y se muestra el dibujo
  private fotoFallida = signal<string | null>(null);
  readonly foto = computed(() => {
    const url = this.remate().image_url;
    return url && url !== this.fotoFallida() ? this.api.urlDeArchivo(url) : null;
  });

  readonly precio = computed(() => pesos(Number(this.remate().opening_price)));
  readonly precioM2 = computed(() => {
    const superficie = Number(this.remate().physical_info?.surface_m2 ?? 0);
    return superficie > 0 ? `${pesos(Math.round(Number(this.remate().opening_price) / superficie))} / m²` : null;
  });

  // Datos chicos: solo los que el remate tiene
  readonly datos = computed(() => {
    const fisica = this.remate().physical_info;
    const lista: string[] = [];
    const superficie = fisica?.surface_m2 ? Number(fisica.surface_m2) : null;
    if (superficie !== null) lista.push(`${superficie.toLocaleString('es-CL')} m²`);
    if (fisica?.bedrooms) lista.push(`${fisica.bedrooms} dorm.`);
    if (fisica?.bathrooms) lista.push(`${fisica.bathrooms} ${fisica.bathrooms === 1 ? 'baño' : 'baños'}`);
    return lista;
  });

  readonly retirado = computed(() => remateRetirado(this.remate().status));
  readonly finalizado = computed(() => remateFinalizado(this.remate().auction_date));
  readonly fechaRemate = computed(() => {
    const fecha = this.remate().auction_date;
    return fecha ? textoRemate(fecha) : null;
  });
  readonly publicado = computed(() => textoPublicado(this.remate().created_at));
  readonly riesgo = computed(() => this.remate().evaluation?.result_level ?? 'amarillo');

  fotoNoCargo() {
    this.fotoFallida.set(this.remate().image_url);
  }

  clicCorazon(evento: Event) {
    // Que el clic en el corazón no abra el detalle
    evento.preventDefault();
    evento.stopPropagation();
    this.alternarFavorito.emit();
  }
}
