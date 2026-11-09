import { Component, DestroyRef, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { NavController } from '@ionic/angular/lazy';

import { ApiService, mensajeDeError } from '../core/api.service';

// Paso A10: el buscador de las pantallas del analista, igual que pages/reportes/Buscador.tsx de la web.
// Mientras se escribe muestra los remates que calzan (GET /reportes/buscar); al elegir uno se abre su ficha
// con el período elegido. Paso A14: al administrador también le muestra personas (la API solo se las manda a él).

interface Resultados {
  remates: { id: string; title: string; comuna: string | null; codigo: string | null; estado: string }[];
  personas?: { id: string; full_name: string; email: string; estado: string }[] | null;
}

interface Opcion {
  clave: string;
  grupo: 'Remates' | 'Personas';
  titulo: string;
  detalle: string;
  ruta: string;
}

const ESPERA_MS = 300; // se busca cuando se deja de escribir por un momento
let siguienteLista = 0;

@Component({
  selector: 'app-buscador-reportes',
  standalone: false,
  host: { class: 'rep-buscador' },
  template: `
    <svg class="rep-buscador-icono" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
    <input
      #campo
      type="search"
      placeholder="Buscar un remate"
      aria-label="Buscar un remate por nombre, comuna, dirección o código"
      role="combobox"
      aria-autocomplete="list"
      autocomplete="off"
      [value]="texto()"
      [attr.aria-expanded]="mostrarLista()"
      [attr.aria-controls]="idDeLaLista"
      [attr.aria-activedescendant]="opcionMarcada()"
      (input)="cambiarTexto(campo.value)"
      (focus)="abierto.set(true)"
      (blur)="abierto.set(false)"
      (keydown)="teclas($event)" />
    @if (buscando()) {
      <span class="rep-buscador-buscando">Buscando...</span>
    }

    @if (mostrarLista()) {
      <ul class="rep-buscador-lista" role="listbox" aria-label="Resultados" [id]="idDeLaLista">
        @if (error(); as mensaje) {
          <li class="rep-buscador-vacio" role="presentation">No se pudo buscar: {{ mensaje }}</li>
        } @else if (opciones().length === 0) {
          <li class="rep-buscador-vacio" role="presentation">
            No encontramos {{ conPersonas() ? 'remates ni personas' : 'remates' }} con «{{ limpio() }}».
          </li>
        }
        @for (opcion of opciones(); track opcion.clave; let i = $index) {
          <li role="presentation">
            <!-- El nombre del grupo va antes de su primera opción -->
            @if (i === 0 || opciones()[i - 1].grupo !== opcion.grupo) {
              <span class="rep-buscador-grupo">{{ opcion.grupo }}</span>
            }
            <!-- Se usa mousedown para elegir antes de que el campo pierda el foco (y se cierre la lista) -->
            <span
              role="option"
              class="rep-buscador-opcion"
              [id]="idDeLaOpcion(i)"
              [class.is-activa]="i === activa()"
              [attr.aria-selected]="i === activa()"
              (mousedown)="elegirConElMouse($event, opcion)"
              (mouseenter)="activa.set(i)">
              <strong>{{ opcion.titulo }}</strong>
              <span>{{ opcion.detalle }}</span>
            </span>
          </li>
        }
      </ul>
    }
  `,
})
export class BuscadorReportesComponent {
  private api = inject(ApiService);
  private navegacion = inject(NavController);

  private campo = viewChild.required<ElementRef<HTMLInputElement>>('campo');

  // Paso A14: dónde están las fichas (/analista o /reportes) y si se muestran personas (solo el administrador)
  readonly base = input('/analista');
  readonly conPersonas = input(false);

  readonly idDeLaLista = `rep-buscador-${++siguienteLista}`;
  readonly texto = signal('');
  readonly limpio = computed(() => this.texto().trim());
  private resultados = signal<Resultados | null>(null);
  readonly buscando = signal(false);
  readonly error = signal<string | null>(null);
  readonly abierto = signal(false);
  readonly activa = signal(-1); // -1 = ninguna marcada (Enter elige la primera)

  private espera: ReturnType<typeof setTimeout> | null = null;
  private turno = 0;

  // Las opciones en el orden en que se muestran: primero los remates, después las personas
  readonly opciones = computed<Opcion[]>(() => {
    const resultados = this.resultados();
    if (!resultados) {
      return [];
    }
    const base = this.base();
    return [
      ...resultados.remates.map((r) => ({
        clave: `r-${r.id}`,
        grupo: 'Remates' as const,
        titulo: r.title,
        detalle: [r.comuna, r.codigo && `código ${r.codigo}`, r.estado].filter(Boolean).join(' · '),
        ruta: `${base}/remate/${r.id}`,
      })),
      ...(this.conPersonas() ? (resultados.personas ?? []) : []).map((p) => ({
        clave: `p-${p.id}`,
        grupo: 'Personas' as const,
        titulo: p.full_name,
        detalle: p.estado === 'Activa' ? p.email : `${p.email} · ${p.estado}`,
        ruta: `${base}/persona/${p.id}`,
      })),
    ];
  });

  readonly mostrarLista = computed(
    () => this.abierto() && this.limpio().length >= 2 && (this.resultados() !== null || this.error() !== null),
  );

  readonly opcionMarcada = computed(() =>
    this.mostrarLista() && this.activa() >= 0 && this.activa() < this.opciones().length
      ? this.idDeLaOpcion(this.activa())
      : null,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelarEspera());
  }

  idDeLaOpcion(i: number): string {
    return `${this.idDeLaLista}-${i}`;
  }

  cambiarTexto(nuevo: string) {
    this.texto.set(nuevo);
    this.abierto.set(true);
    this.cancelarEspera();
    const limpio = nuevo.trim();
    if (limpio.length < 2) {
      this.turno++;
      this.resultados.set(null);
      this.buscando.set(false);
      return;
    }
    // Se pide a la API cuando hay al menos 2 letras y se dejó de escribir
    this.buscando.set(true);
    const turno = ++this.turno;
    this.espera = setTimeout(() => void this.buscar(limpio, turno), ESPERA_MS);
  }

  private async buscar(limpio: string, turno: number) {
    try {
      const datos = await this.api.get<Resultados>(`/reportes/buscar?q=${encodeURIComponent(limpio)}`);
      if (turno === this.turno) {
        this.resultados.set(datos);
        this.error.set(null);
        this.activa.set(-1);
      }
    } catch (error) {
      if (turno === this.turno) {
        this.error.set(mensajeDeError(error));
      }
    } finally {
      if (turno === this.turno) {
        this.buscando.set(false);
      }
    }
  }

  private cancelarEspera() {
    if (this.espera !== null) {
      clearTimeout(this.espera);
      this.espera = null;
    }
  }

  elegirConElMouse(evento: Event, opcion: Opcion) {
    evento.preventDefault();
    this.elegir(opcion);
  }

  private elegir(opcion: Opcion) {
    void this.navegacion.navigateForward(opcion.ruta);
    this.turno++;
    this.texto.set('');
    this.resultados.set(null);
    this.buscando.set(false);
    this.abierto.set(false);
    this.campo().nativeElement.blur();
  }

  teclas(evento: KeyboardEvent) {
    if (evento.key === 'Escape') {
      this.abierto.set(false);
      return;
    }
    const opciones = this.opciones();
    if (opciones.length === 0) {
      return;
    }
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      this.abierto.set(true);
      this.activa.set((this.activa() + 1) % opciones.length);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      this.activa.set(this.activa() <= 0 ? opciones.length - 1 : this.activa() - 1);
    } else if (evento.key === 'Enter' && this.abierto()) {
      evento.preventDefault();
      const i = this.activa();
      this.elegir(opciones[i >= 0 && i < opciones.length ? i : 0]);
    }
  }
}
