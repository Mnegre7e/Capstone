import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular/lazy';
import { map } from 'rxjs';

import { ApiService, mensajeDeError } from '../../core/api.service';
import {
  CADA,
  CifraReporte,
  FichaPersona,
  Medida,
  fechaCorta,
  numero,
  pesos,
  plural,
  textoDelPeriodo,
} from '../../core/reportes';
import { ReportesService } from '../../core/reportes.service';

// Paso A14: la ficha de una persona en Reportes (solo el administrador; se abre desde el buscador o desde
// "Quiénes la vieron" de un remate), igual que pages/reportes/FichaPersonaPage.tsx de la web.
// GET /reportes/personas/{id}: sus datos y lo que hizo en el período elegido.

const DESDE_DONDE: Record<string, string> = { web: 'desde la página web', app: 'desde la app' };

// "2026-11-07T17:43:00-03:00" -> "7 nov 2026, 17:43"
function fechaYHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

@Component({
  selector: 'app-persona',
  templateUrl: './persona.page.html',
  styleUrls: ['./persona.page.scss'],
  standalone: false,
})
export class PersonaPage {
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
  private llegada = signal<{ clave: string; ficha: FichaPersona } | null>(null);
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

  // Los datos de arriba de la ficha
  readonly datos = computed(() => {
    const ficha = this.ficha();
    if (!ficha) return null;
    const conPremium = ficha.premium_vigente;
    return {
      conPremium,
      registrada: ficha.registrada_el ? fechaCorta(ficha.registrada_el) : 'Sin dato',
      desdeDonde: ficha.plataforma ? (DESDE_DONDE[ficha.plataforma] ?? null) : null,
      ultimoInicio: ficha.ultimo_inicio ? fechaYHora(ficha.ultimo_inicio) : 'Nunca',
      premium:
        ficha.premium_hasta === null
          ? 'No tiene'
          : conPremium
            ? `Hasta el ${fechaCorta(ficha.premium_hasta)}`
            : `Venció el ${fechaCorta(ficha.premium_hasta)}`,
      pagos: ficha.pagos === 0 ? 'Ninguno' : `${plural(ficha.pagos, 'pago', 'pagos')} · ${pesos(ficha.pagado)}`,
    };
  });

  readonly cifras = computed<CifraReporte[]>(() => {
    const ficha = this.ficha();
    if (!ficha) return [];
    const texto = textoDelPeriodo(ficha);
    return [
      { titulo: 'Inicios de sesión', valor: numero(ficha.inicios), nota: `en ${texto}` },
      { titulo: 'Vistas', valor: numero(ficha.vistas), nota: `de ${plural(ficha.remates_vistos, 'remate', 'remates')} distintos` },
      { titulo: 'Guardados', valor: numero(ficha.guardados), nota: `en ${texto} · ${plural(ficha.quitados, 'quitado', 'quitados')}` },
      {
        titulo: 'Alertas activas',
        valor: numero(ficha.alertas_activas),
        nota: `${plural(ficha.opiniones, 'opinión', 'opiniones')} en ${texto}`,
      },
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
      const datos = await this.api.get<FichaPersona>(`/reportes/personas/${id}?${consulta}`);
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
