import { Component, computed, inject, signal } from '@angular/core';

import {
  CargaResumen,
  HORAS_SIN_CARGA,
  NOMBRE_ESTADO_CARGA,
  horasDesde,
  numero,
  textoCifras,
  textoCuando,
  textoDuracion,
  textoOrigen,
} from '../../core/admin';
import { ApiService, mensajeDeError } from '../../core/api.service';
import { pesos } from '../../core/remates';

// Paso A9: el Panel del administrador, igual que AdminPanelPage de la web (antes tenía datos de ejemplo).
// Resumen de los últimos días (GET /admin/panel) y lo que tiene pendiente.

interface PublicacionMasVista {
  id: string;
  title: string;
  comuna: string | null;
  vistas: number;
  guardados: number;
}

interface ResumenPremium {
  activos: number; // inversionistas con el plan vigente hoy
  vencidos: number; // su plan venció en el período y no lo renovaron
  pagos: number; // pagos aprobados en el período
  ingresos_periodo: number;
  ingresos_mes: number; // desde el día 1 de este mes
  ambiente: string; // "integracion" = pagos de prueba
}

/** Lo que responde GET /admin/panel */
interface Panel {
  dias: number;
  usuarios_nuevos: number;
  usuarios_total: number;
  publicaciones_nuevas: number;
  publicaciones_vigentes: number;
  vistas: number;
  guardados: number;
  mas_vistas: PublicacionMasVista[];
  semaforo: Record<string, number>; // verde, amarillo, rojo, sin_evaluar
  opiniones_por_responder: number;
  ultima_carga: CargaResumen | null;
  premium: ResumenPremium | null;
}

/** Una tarea pendiente (el aviso de la carga de remates no tiene número ni enlace: se revisa en la web). */
interface Pendiente {
  clave: string;
  cantidad?: number;
  texto: string;
  enlace?: string;
  accion?: string;
}

const NIVELES: { valor: string; nombre: string }[] = [
  { valor: 'verde', nombre: 'Riesgo bajo' },
  { valor: 'amarillo', nombre: 'Riesgo medio' },
  { valor: 'rojo', nombre: 'Riesgo alto' },
  { valor: 'sin_evaluar', nombre: 'Sin evaluar' },
];

/** Aviso si la última carga de remates falló, o si hace mucho que no hay una. */
function avisoDeCarga(ultima: CargaResumen | null): Pendiente | null {
  if (!ultima) {
    return { clave: 'carga', texto: 'Todavía no hay ninguna carga de remates registrada.' };
  }
  if (ultima.status === 'fallida') {
    return { clave: 'carga', texto: `La última carga de remates falló (${textoCuando(ultima.started_at)}).` };
  }
  const horas = horasDesde(ultima.started_at);
  if (ultima.status !== 'en_curso' && horas > HORAS_SIN_CARGA) {
    const tiempo = horas >= 48 ? `${Math.floor(horas / 24)} días` : `${Math.floor(horas)} horas`;
    return { clave: 'carga', texto: `No hay una carga de remates desde hace ${tiempo}.` };
  }
  return null;
}

function porcentaje(parte: number, total: number): string {
  return total === 0 ? '0 %' : `${Math.round((parte / total) * 100)} %`;
}

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.page.html',
  styleUrls: ['./admin-home.page.scss'],
  standalone: false,
})
export class AdminHomePage {
  private api = inject(ApiService);

  readonly numero = numero;
  readonly pesos = pesos;
  readonly NOMBRE_ESTADO_CARGA = NOMBRE_ESTADO_CARGA;

  readonly panel = signal<Panel | null>(null);
  readonly error = signal<string | null>(null);

  readonly cifras = computed(() => {
    const panel = this.panel();
    if (!panel) return [];
    return [
      { titulo: 'Usuarios nuevos', valor: panel.usuarios_nuevos, nota: `de ${numero(panel.usuarios_total)} inversionistas` },
      {
        titulo: 'Publicaciones nuevas',
        valor: panel.publicaciones_nuevas,
        nota: `${numero(panel.publicaciones_vigentes)} vigentes en total`,
      },
      { titulo: 'Vistas', valor: panel.vistas, nota: `propiedades abiertas en los últimos ${panel.dias} días` },
      { titulo: 'Guardados', valor: panel.guardados, nota: `favoritos agregados en los últimos ${panel.dias} días` },
    ];
  });

  readonly pendientes = computed(() => {
    const panel = this.panel();
    if (!panel) return [];
    const lista: Pendiente[] = [];
    if (panel.opiniones_por_responder > 0) {
      lista.push({
        clave: 'opiniones',
        cantidad: panel.opiniones_por_responder,
        texto: panel.opiniones_por_responder === 1 ? 'opinión por responder' : 'opiniones por responder',
        enlace: '/opiniones',
        accion: 'Ver opiniones',
      });
    }
    const avisoCarga = avisoDeCarga(panel.ultima_carga);
    if (avisoCarga) lista.unshift(avisoCarga); // el aviso de la carga va primero
    return lista;
  });

  readonly carga = computed(() => {
    const ultima = this.panel()?.ultima_carga;
    if (!ultima) return null;
    return {
      estado: ultima.status,
      cuando:
        `${textoCuando(ultima.started_at)} · ${textoOrigen(ultima.origin).toLowerCase()} · ` +
        (ultima.status === 'en_curso' ? 'todavía corriendo' : textoDuracion(ultima.minutos)),
      cifras: textoCifras(ultima),
      motivo: ultima.error_message,
    };
  });

  readonly mesActual = new Date().toLocaleDateString('es-CL', { month: 'long' }); // "noviembre"

  readonly niveles = computed(() => {
    const semaforo = this.panel()?.semaforo ?? {};
    const lista = NIVELES.map((nivel) => ({ ...nivel, cantidad: semaforo[nivel.valor] ?? 0 }));
    const total = lista.reduce((suma, nivel) => suma + nivel.cantidad, 0);
    return {
      total,
      lista: lista.map((nivel) => ({
        ...nivel,
        porcentaje: porcentaje(nivel.cantidad, total),
        titulo: `${nivel.nombre}: ${numero(nivel.cantidad)} (${porcentaje(nivel.cantidad, total)})`,
      })),
      descripcion: lista.map((nivel) => `${nivel.nombre}: ${nivel.cantidad}`).join(', '),
    };
  });

  async ionViewWillEnter() {
    // Se pide cada vez que se entra: así las cifras están al día
    try {
      this.panel.set(await this.api.get<Panel>('/admin/panel'));
      this.error.set(null);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }
}
