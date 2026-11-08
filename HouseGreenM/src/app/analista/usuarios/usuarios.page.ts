import { Component, computed, inject, signal } from '@angular/core';

import { CADA, CifraReporte, FilaBarras, Medida, numero, pesos, plural } from '../../core/reportes';
import { ReportesService } from '../../core/reportes.service';

// Paso A10: Usuarios, igual que pages/reportes/UsuariosPage.tsx de la web (antes eran datos de ejemplo).
// Quiénes se registran, cuánto usan HouseGreen, qué opinan y el plan Premium (GET /reportes).
// El analista ve los totales: los nombres y correos solo los ve el administrador (en la web).
@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  standalone: false,
})
export class UsuariosPage {
  readonly rep = inject(ReportesService);
  readonly OPCIONES: Medida[] = ['registros', 'suscripciones'];
  readonly medida = signal<Medida>('registros'); // registros o suscripciones
  readonly numero = numero;
  readonly pesos = pesos;
  readonly plural = plural;

  readonly cifras = computed<CifraReporte[]>(() => {
    const reporte = this.rep.reporte();
    if (!reporte) {
      return [];
    }
    const { usuarios, actividad } = reporte;
    const texto = this.rep.textoPeriodo();
    return [
      { titulo: 'Personas registradas', valor: numero(usuarios.total), nota: `${numero(usuarios.activos)} pueden entrar hoy` },
      { titulo: 'Nuevas', valor: numero(usuarios.nuevos), nota: `se registraron en ${texto}` },
      {
        titulo: 'Bajas',
        valor: numero(usuarios.eliminaron_su_cuenta),
        nota: `eliminaron su cuenta · ${plural(usuarios.suspendidas, 'suspendida', 'suspendidas')} hoy`,
      },
      {
        titulo: 'Calificación',
        valor: actividad.calificacion_promedio === null ? '—' : `${actividad.calificacion_promedio.toLocaleString('es-CL')} / 5`,
        nota: plural(actividad.opiniones, 'opinión', 'opiniones') + ` en ${texto}`,
      },
    ];
  });

  readonly tituloGrafico = computed(() => {
    const reporte = this.rep.reporte();
    const que = this.medida() === 'suscripciones' ? 'Suscripciones' : 'Registros';
    return reporte ? `${que} ${CADA[reporte.agrupado_por].por}` : que;
  });

  readonly embudo = computed<FilaBarras[]>(() => {
    const embudo = this.rep.reporte()?.embudo;
    if (!embudo) {
      return [];
    }
    return [
      { nombre: 'Cuentas activas', cantidad: embudo.activos },
      { nombre: 'Vieron al menos un remate', cantidad: embudo.vieron },
      { nombre: 'Tienen remates guardados', cantidad: embudo.guardaron },
      { nombre: 'Tienen alertas', cantidad: embudo.con_alertas },
    ];
  });

  readonly calificaciones = computed<FilaBarras[]>(() => {
    const calificaciones = this.rep.reporte()?.calificaciones ?? {};
    return [5, 4, 3, 2, 1].map((nota) => ({
      nombre: `${nota} ${nota === 1 ? 'estrella' : 'estrellas'}`,
      cantidad: calificaciones[String(nota)] ?? 0,
    }));
  });

  readonly opiniones = computed(() =>
    Object.values(this.rep.reporte()?.calificaciones ?? {}).reduce((suma, n) => suma + n, 0),
  );

  readonly plataformas = computed<FilaBarras[]>(() => {
    const porPlataforma = this.rep.reporte()?.usuarios.por_plataforma ?? {};
    return [
      { nombre: 'Página web', cantidad: porPlataforma['web'] ?? 0 },
      { nombre: 'App', cantidad: porPlataforma['app'] ?? 0 },
      { nombre: 'Sin dato', cantidad: porPlataforma['sin_dato'] ?? 0 },
    ].filter((fila) => fila.nombre !== 'Sin dato' || fila.cantidad > 0);
  });

  readonly haySinDato = computed(() => (this.rep.reporte()?.usuarios.por_plataforma['sin_dato'] ?? 0) > 0);

  readonly inicios = computed<FilaBarras[]>(() => {
    const actividad = this.rep.reporte()?.actividad;
    if (!actividad) {
      return [];
    }
    return [
      { valor: 'inversionista', nombre: 'Inversionistas' },
      { valor: 'analista', nombre: 'Analistas' },
      { valor: 'administrador', nombre: 'Administradores' },
    ].map((tipo) => ({
      nombre: tipo.nombre,
      cantidad: actividad.inicios_de_sesion[tipo.valor] ?? 0,
      nota: plural(actividad.personas_que_entraron[tipo.valor] ?? 0, 'persona', 'personas'),
    }));
  });
}
