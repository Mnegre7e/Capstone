import { Component, computed, input } from '@angular/core';

import { Evaluacion, Riesgo } from '../core/remates';

// Paso A3: la tarjeta del semáforo del detalle (igual a la web): puntaje de 0 a 8, por qué lo tiene
// (cada uno de los 4 factores) y qué le falta para subir de zona.

const PUNTAJE_MAXIMO = 8;
const PUNTOS_PARA_VERDE = 6;
const PUNTOS_PARA_AMARILLO = 3;

// Paso A18: para la frase "lo que indica un nivel de riesgo bajo"
const NOMBRE_DEL_NIVEL: Record<Riesgo, string> = { verde: 'bajo', amarillo: 'medio', rojo: 'alto' };

const TEXTOS: Record<Riesgo, { titulo: string; consejo: string }> = {
  verde: { titulo: 'Riesgo bajo', consejo: 'Buena oportunidad' },
  amarillo: { titulo: 'Riesgo medio', consejo: 'Complicado pero viable' },
  rojo: { titulo: 'Riesgo alto', consejo: 'Mejor dejarla pasar' },
};

const FACTORES: Record<string, { nombre: string; porPuntos: [string, string, string]; sinDato: string }> = {
  // Paso A18: nombres y textos más fáciles de entender (los mismos en la web)
  precio_rentabilidad: {
    nombre: 'Precio comparado con otras propiedades del sector',
    porPuntos: ['Cerca o sobre el precio habitual', 'Dentro del rango habitual', 'Bajo el precio habitual del sector'],
    sinDato: 'Sin referencia',
  },
  estado_legal: {
    nombre: 'Situación legal de la propiedad',
    porPuntos: ['Sin dominio inscrito', 'Se rematan derechos o una parte', 'Propiedad con un solo titular registrado'],
    sinDato: 'Sin información del dominio',
  },
  dinamismo_barrio: {
    nombre: 'Actividad y atractivo del sector',
    porPuntos: ['Bajo nivel de actividad', 'Nivel intermedio de actividad', 'Alto nivel de actividad'],
    sinDato: 'Sin dato',
  },
  seguridad_comuna: {
    nombre: 'Nivel de seguridad del sector',
    porPuntos: ['Nivel bajo', 'Nivel intermedio', 'Nivel alto'],
    sinDato: 'Sin dato',
  },
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
      // Paso A18: "Esta propiedad obtuvo 6 de 8 puntos, lo que indica un nivel de riesgo bajo según los factores evaluados."
      partes.push(
        `Esta propiedad obtuvo ${puntos} de ${PUNTAJE_MAXIMO} puntos, lo que indica un nivel de riesgo ${NOMBRE_DEL_NIVEL[this.nivel()]} según los factores evaluados.`,
      );
      if (this.nivel() === 'amarillo') {
        const faltan = PUNTOS_PARA_VERDE - puntos;
        partes.push(`${faltan === 1 ? 'Le falta' : 'Le faltan'} ${enPuntos(faltan)} para llegar a riesgo bajo.`);
      } else if (this.nivel() === 'rojo') {
        const faltan = PUNTOS_PARA_AMARILLO - puntos;
        partes.push(`${faltan === 1 ? 'Le falta' : 'Le faltan'} ${enPuntos(faltan)} para llegar a riesgo medio.`);
      }
    }
    const sinDato = this.factores()
      .filter((f) => !f.tieneDato)
      .map((f) => f.nombre.toLowerCase());
    if (sinDato.length === 1) {
      partes.push(`No hay información sobre ${sinDato[0]}, así que ese factor suma 0 puntos.`);
    } else if (sinDato.length > 1) {
      partes.push(
        `No hay información sobre ${sinDato.slice(0, -1).join(', ')} y ${sinDato[sinDato.length - 1]}, así que esos factores suman 0 puntos.`,
      );
    }
    if (this.factores().some((f) => f.clave === 'precio_rentabilidad' && !f.tieneDato)) {
      partes.push('El motivo del precio está más abajo.');
    }
    return partes.join(' ');
  });
}
