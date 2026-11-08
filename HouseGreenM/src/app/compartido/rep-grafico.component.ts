import { Component, computed, input, signal } from '@angular/core';

import { Agrupado, CADA, Medida, MEDIDAS, MESES, nombreDeLaFecha, numero, plural, PuntoDeLaSerie, topeRedondo } from '../core/reportes';

// Paso A10: una pieza de las pantallas del analista, igual que pages/reportes/piezas.tsx de la web
// (lleva las mismas clases de la web; estilos en theme/_reportes.scss).

// ---------- Gráfico de columnas: cuántos hubo cada hora, día o mes de una medida ----------
// "agrupado" dice si cada barra es una hora (Hoy), un día o un mes.
// "columnas" son las medidas de la tabla de abajo (la ficha de un remate solo tiene vistas y guardados).
// Al tocar una columna (o pasar el mouse) se ve su número y su fecha.
@Component({
  selector: 'app-rep-grafico',
  standalone: false,
  template: `
    @if (total() === 0) {
      <p class="rep-vacio">No hubo {{ info().plural }} en este período.</p>
    } @else {
      <div class="rep-grafico">
        <div class="rep-grafico-zona">
          <!-- Líneas de fondo y números del eje: 0, la mitad y el tope -->
          @for (valor of guias(); track $index) {
            <div class="rep-guia" [style.bottom.%]="(valor / tope()) * 100">
              <span>{{ textoGuia(valor) }}</span>
            </div>
          }

          <div class="rep-columnas" (mouseleave)="activa.set(null)">
            @for (punto of serie(); track punto.fecha; let i = $index) {
              <div
                class="rep-columna"
                tabindex="0"
                [class.is-activa]="activa() === i"
                [attr.aria-label]="fechaLarga(punto) + ': ' + textoValor(punto)"
                (mouseenter)="activa.set(i)"
                (focus)="activa.set(i)"
                (click)="activa.set(i)"
                (blur)="activa.set(null)">
                @if (punto[medida()] > 0) {
                  <span class="rep-barra" [style.height.%]="(punto[medida()] / tope()) * 100"></span>
                }
                @if (activa() === i) {
                  <span
                    class="rep-globo"
                    role="tooltip"
                    [class.is-izquierda]="i < serie().length / 2"
                    [class.is-derecha]="i >= serie().length / 2">
                    <strong>{{ textoValor(punto) }}</strong>
                    <span>{{ fechaLarga(punto) }}</span>
                  </span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Fechas debajo del gráfico -->
        <div class="rep-fechas" aria-hidden="true">
          @for (punto of serie(); track punto.fecha; let i = $index) {
            <span [class.is-extra]="!esClave(i)">{{ fechaDebajo(punto, i) }}</span>
          }
        </div>

        <!-- Los mismos datos en una tabla (para leerlos exactos o con lector de pantalla) -->
        <details class="rep-tabla">
          <summary>Ver los datos en una tabla</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">{{ columnaFecha() }}</th>
                @for (m of medidasDeLaTabla(); track m.valor) {
                  <th scope="col">{{ m.nombre }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (punto of serie(); track punto.fecha) {
                <tr>
                  <th scope="row">{{ fechaLarga(punto) }}</th>
                  @for (m of medidasDeLaTabla(); track m.valor) {
                    <td>{{ numero(punto[m.valor]) }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </details>
      </div>
    }
  `,
})
export class GraficoReporteComponent {
  readonly serie = input.required<PuntoDeLaSerie[]>();
  readonly medida = input.required<Medida>();
  readonly agrupado = input.required<Agrupado>();
  readonly columnas = input<Medida[] | null>(null);

  readonly activa = signal<number | null>(null);
  readonly numero = numero;

  readonly medidasDeLaTabla = computed(() => {
    const columnas = this.columnas();
    return columnas ? MEDIDAS.filter((m) => columnas.includes(m.valor)) : MEDIDAS;
  });
  readonly info = computed(() => MEDIDAS.find((m) => m.valor === this.medida()) ?? MEDIDAS[0]);
  private valores = computed(() => this.serie().map((punto) => punto[this.medida()]));
  readonly total = computed(() => this.valores().reduce((suma, valor) => suma + valor, 0));
  readonly tope = computed(() => topeRedondo(Math.max(...this.valores(), 0)));
  readonly guias = computed(() => [this.tope(), this.tope() / 2, 0]);
  readonly columnaFecha = computed(() => CADA[this.agrupado()].columna);

  // Con muchas barras no caben todas las fechas: se muestra una de cada "salto" (y siempre la última).
  // En celular quedan solo la primera, la del medio y la última (las "clave").
  private salto = computed(() => (this.serie().length <= 12 ? 1 : Math.ceil(this.serie().length / 6)));
  private ultima = computed(() => this.serie().length - 1);
  private medio = computed(() => Math.round(this.ultima() / 2 / this.salto()) * this.salto());

  esClave(i: number): boolean {
    return i === 0 || i === this.ultima() || i === this.medio();
  }

  textoGuia(valor: number): string {
    return Number.isInteger(valor) ? numero(valor) : '';
  }

  textoValor(punto: PuntoDeLaSerie): string {
    return plural(punto[this.medida()], this.info().singular, this.info().plural);
  }

  fechaLarga(punto: PuntoDeLaSerie): string {
    return nombreDeLaFecha(punto.fecha, true);
  }

  fechaDebajo(punto: PuntoDeLaSerie, i: number): string {
    if (i % this.salto() !== 0 && i !== this.ultima()) {
      return '';
    }
    return this.agrupado() === 'mes' ? MESES[Number(punto.fecha.split('-')[1]) - 1] : nombreDeLaFecha(punto.fecha);
  }
}
