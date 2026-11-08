import { Component, computed, input } from '@angular/core';

import { Evaluacion, Riesgo } from '../core/remates';

// Paso A3: la tarjeta del semáforo del detalle (igual a la web): puntaje de 0 a 8, por qué lo tiene
// (cada uno de los 4 factores) y qué le falta para subir de zona.

const PUNTAJE_MAXIMO = 8;
const PUNTOS_PARA_VERDE = 6;
const PUNTOS_PARA_AMARILLO = 3;

const TEXTOS: Record<Riesgo, { titulo: string; consejo: string }> = {
  verde: { titulo: 'Riesgo bajo', consejo: 'Excelente opción' },
  amarillo: { titulo: 'Riesgo medio', consejo: 'Complicado pero viable' },
  rojo: { titulo: 'Riesgo alto', consejo: 'Mejor dejarla pasar' },
};

const FACTORES: Record<string, { nombre: string; porPuntos: [string, string, string]; sinDato: string }> = {
  precio_rentabilidad: {
    nombre: 'Precio frente a la comuna',
    porPuntos: ['Poco conveniente', 'Regular', 'Bueno'],
    sinDato: 'Sin referencia',
  },
  estado_legal: {
    nombre: 'Estado legal',
    porPuntos: ['Sin dominio', 'Otro tipo de dominio', 'Dominio exclusivo'],
    sinDato: 'Dominio no especificado',
  },
  dinamismo_barrio: { nombre: 'Dinamismo del barrio', porPuntos: ['Bajo', 'Medio', 'Alto'], sinDato: 'Sin dato' },
  seguridad_comuna: { nombre: 'Seguridad de la comuna', porPuntos: ['Baja', 'Media', 'Alta'], sinDato: 'Sin dato' },
};

function enPuntos(cantidad: number): string {
  return cantidad === 1 ? '1 punto' : `${cantidad} puntos`;
}

@Component({
  selector: 'app-tarjeta-semaforo',
  standalone: false,
  templateUrl: './tarjeta-semaforo.component.html',
  styleUrls: ['./tarjeta-semaforo.component.scss'],
})
export class TarjetaSemaforoComponent {
  readonly evaluacion = input<Evaluacion | null>(null);

  readonly PUNTAJE_MAXIMO = PUNTAJE_MAXIMO;
  readonly casillas = Array.from({ length: PUNTAJE_MAXIMO }, (_, i) => i);

  readonly nivel = computed(() => this.evaluacion()?.result_level ?? 'amarillo');
  readonly puntos = computed(() => this.evaluacion()?.total_points ?? 0);
  readonly textos = computed(() => TEXTOS[this.nivel()]);
  readonly fecha = computed(() => {
    const e = this.evaluacion();
    return e ? new Date(e.evaluated_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  });

  // "Precio sin dato; Dominio no especificado" -> ["Precio sin dato", "Dominio no especificado"]
  readonly pendientes = computed(() =>
    (this.evaluacion()?.missing_data ?? '')
      .split(';')
      .map((parte) => parte.trim())
      .filter((parte) => parte !== ''),
  );
  readonly tieneVeto = computed(() => Boolean(this.evaluacion()?.veto_applied && this.evaluacion()?.veto_reason));

  // Solo los factores que la app conoce (las evaluaciones antiguas traían otros)
  readonly factores = computed(() =>
    (this.evaluacion()?.details ?? [])
      .filter((detalle) => detalle.criteria_name in FACTORES)
      .map((detalle) => {
        const factor = FACTORES[detalle.criteria_name];
        return {
          clave: detalle.criteria_name,
          nombre: factor.nombre,
          texto: detalle.has_data ? factor.porPuntos[detalle.points] : factor.sinDato,
          clase: detalle.has_data ? `is-p${detalle.points}` : 'is-sin-dato',
          tieneDato: detalle.has_data,
        };
      }),
  );

  // Qué le falta para subir de zona
  readonly explicacion = computed(() => {
    const partes: string[] = [];
    const puntos = this.puntos();
    if (!this.tieneVeto()) {
      if (this.nivel() === 'verde') {
        partes.push(`Está en riesgo bajo porque suma ${PUNTOS_PARA_VERDE} puntos o más.`);
      } else if (this.nivel() === 'amarillo') {
        const faltan = PUNTOS_PARA_VERDE - puntos;
        partes.push(`${faltan === 1 ? 'Le falta' : 'Le faltan'} ${enPuntos(faltan)} para riesgo bajo.`);
      } else {
        const faltan = PUNTOS_PARA_AMARILLO - puntos;
        partes.push(`${faltan === 1 ? 'Le falta' : 'Le faltan'} ${enPuntos(faltan)} para riesgo medio.`);
      }
    }
    const sinDato = this.factores()
      .filter((f) => !f.tieneDato)
      .map((f) => f.nombre.toLowerCase());
    if (sinDato.length === 1) {
      partes.push(`Sin dato en ${sinDato[0]}: ese factor vale 0 puntos.`);
    } else if (sinDato.length > 1) {
      partes.push(`Sin dato en ${sinDato.slice(0, -1).join(', ')} y ${sinDato[sinDato.length - 1]}: esos factores valen 0 puntos.`);
    }
    if (this.factores().some((f) => f.clave === 'precio_rentabilidad' && !f.tieneDato)) {
      partes.push('El motivo del precio está más abajo.');
    }
    return partes.join(' ');
  });
}
