import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular/lazy';
import { map } from 'rxjs';

import { ApiService, mensajeDeError } from '../../core/api.service';
import {
  CADA,
  CifraReporte,
  FichaRemate,
  Medida,
  NIVELES,
  fechaCorta,
  numero,
  pesos,
  plural,
  textoDelPeriodo,
} from '../../core/reportes';
import { ReportesService } from '../../core/reportes.service';

// Paso A10: la ficha de un remate (se abre desde el buscador), igual que pages/reportes/FichaRematePage.tsx de la web.
// GET /reportes/remates/{id}: sus datos y sus números del período elegido.
// Paso A14: el administrador ve además quiénes lo vieron o lo guardaron (igual que en la web).
@Component({
  selector: 'app-remate',
  templateUrl: './remate.page.html',
  styleUrls: ['./remate.page.scss'],
  standalone: false,
})
export class RematePage {
  readonly rep = inject(ReportesService);
  private api = inject(ApiService);
  private navegacion = inject(NavController);

  readonly plural = plural;
  readonly OPCIONES: Medida[] = ['vistas', 'guardados'];
  readonly COLUMNAS: Medida[] = ['vistas', 'guardados'];
  readonly medida = signal<Medida>('vistas');

  readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((parametros) => parametros.get('id'))), {
    initialValue: null,
  });

  // La ficha que llegó, con la consulta con que se pidió (para saber si está al día)
  private llegada = signal<{ clave: string; ficha: FichaRemate } | null>(null);
  readonly error = signal<string | null>(null);
  private clave = computed(() => `${this.id()}?${this.rep.consultaDelPeriodo()}`);
  private turno = 0;

  readonly ficha = computed(() => {
    const llegada = this.llegada();
    return llegada && llegada.ficha.id === this.id() ? llegada.ficha : null;
  });
  readonly alDia = computed(() => this.llegada()?.clave === this.clave());
  readonly textoPeriodo = computed(() => {
    const ficha = this.ficha();
    return ficha ? textoDelPeriodo(ficha) : '';
  });

  readonly detalle = computed(() => {
    const ficha = this.ficha();
    return ficha ? [ficha.comuna, ficha.tipo, ficha.codigo && `código ${ficha.codigo}`].filter(Boolean).join(' · ') : '';
  });
  readonly nivel = computed(() => NIVELES.find((n) => n.valor === this.ficha()?.semaforo)?.nombre ?? 'Sin evaluar');
  readonly precio = computed(() => {
    const precio = this.ficha()?.precio_minimo ?? null;
    return precio === null ? 'Sin dato' : pesos(precio);
  });
  readonly fecha = computed(() => {
    const fecha = this.ficha()?.fecha_del_remate ?? null;
    return fecha ? fechaCorta(fecha) : 'Sin fecha';
  });

  readonly cifras = computed<CifraReporte[]>(() => {
    const ficha = this.ficha();
    if (!ficha) {
      return [];
    }
    const texto = textoDelPeriodo(ficha);
    return [
      { titulo: 'Vistas', valor: numero(ficha.vistas), nota: `de ${plural(ficha.personas, 'persona', 'personas')} en ${texto}` },
      { titulo: 'Guardados', valor: numero(ficha.guardados), nota: `en ${texto} · ${plural(ficha.quitados, 'quitado', 'quitados')}` },
      { titulo: 'La tienen guardada', valor: numero(ficha.la_tienen_guardada), nota: 'hoy' },
      { titulo: 'Avisos enviados', valor: numero(ficha.avisos), nota: `por sus alertas, en ${texto}` },
    ];
  });

  readonly tituloGrafico = computed(() => {
    const ficha = this.ficha();
    const que = this.medida() === 'guardados' ? 'Guardados' : 'Vistas';
    return ficha ? `${que} ${CADA[ficha.agrupado_por].por}` : que;
  });

  constructor() {
    // Se pide al abrir la ficha y cada vez que cambia el período
    effect(() => {
      const id = this.id();
      const consulta = this.rep.consultaDelPeriodo();
      if (!id || consulta === null) {
        return;
      }
      untracked(() => void this.pedir(id, consulta));
    });
  }

  private async pedir(id: string, consulta: string) {
    const turno = ++this.turno;
    try {
      const datos = await this.api.get<FichaRemate>(`/reportes/remates/${id}?${consulta}`);
      if (turno === this.turno) {
        this.llegada.set({ clave: `${id}?${consulta}`, ficha: datos });
        this.error.set(null);
      }
    } catch (error) {
      if (turno === this.turno) {
        this.error.set(mensajeDeError(error));
      }
    }
  }

  // Volver a donde estaba
  volver() {
    this.navegacion.back();
  }
}
