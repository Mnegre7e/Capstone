import { Component, computed, input, output, signal } from '@angular/core';

import { normalizar } from '../../core/remates';

// Paso A9: el buscador para elegir a quién va un anuncio (una persona o una publicación), igual que "Elegir"
// de AdminAnunciosPage en la web. Muestra los primeros resultados y, ya elegida, la opción con "Cambiar".

export interface Opcion {
  id: string;
  titulo: string;
  detalle: string;
}

const OPCIONES_A_LA_VISTA = 5; // cuántos resultados muestra el buscador

@Component({
  selector: 'app-elegir-opcion',
  standalone: false,
  styleUrls: ['./anuncios.page.scss'], // los mismos estilos de la página (anu-elegir, anu-opciones...)
  template: `
    @if (elegida(); as opcion) {
      <div class="anu-elegida">
        <div class="anu-elegida-texto">
          <p class="anu-elegida-titulo">{{ opcion.titulo }}</p>
          <p class="anu-elegida-detalle">{{ opcion.detalle }}</p>
        </div>
        <button type="button" class="anu-boton-claro" (click)="elegir.emit(null)">Cambiar</button>
      </div>
    } @else if (opciones() === null) {
      <p class="anu-nota">Cargando la lista...</p>
    } @else if (opciones()?.length === 0) {
      <p class="anu-nota">{{ sinOpciones() }}</p>
    } @else {
      <div class="anu-elegir">
        <label class="anu-campo">
          {{ etiqueta() }}
          <input type="search" [placeholder]="textoDeAyuda()" [value]="busqueda()" (input)="buscar($event)" />
        </label>

        @if (coinciden().length === 0) {
          <p class="anu-nota">Nada coincide con esa búsqueda.</p>
        }

        <ul class="anu-opciones">
          @for (opcion of aLaVista(); track opcion.id) {
            <li>
              <button type="button" (click)="elegir.emit(opcion)">
                <span class="anu-opciones-titulo">{{ opcion.titulo }}</span>
                <span class="anu-opciones-detalle">{{ opcion.detalle }}</span>
              </button>
            </li>
          }
        </ul>

        @if (coinciden().length > aLaVista().length) {
          <p class="anu-nota">Hay {{ coinciden().length - aLaVista().length }} más. Escribe para acotar la búsqueda.</p>
        }
      </div>
    }
  `,
})
export class ElegirOpcionComponent {
  readonly etiqueta = input.required<string>();
  readonly textoDeAyuda = input('');
  readonly opciones = input<Opcion[] | null>(null); // null = todavía cargando
  readonly elegida = input<Opcion | null>(null);
  readonly sinOpciones = input('');
  readonly elegir = output<Opcion | null>();

  readonly busqueda = signal('');
  readonly coinciden = computed(() => {
    const texto = normalizar(this.busqueda().trim());
    return (this.opciones() ?? []).filter(
      (o) => texto === '' || normalizar(`${o.titulo} ${o.detalle}`).includes(texto),
    );
  });
  readonly aLaVista = computed(() => this.coinciden().slice(0, OPCIONES_A_LA_VISTA));

  buscar(evento: Event) {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }
}
