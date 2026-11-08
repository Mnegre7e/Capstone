import { Component, computed, inject } from '@angular/core';

import {
  CADA,
  CifraReporte,
  FilaBarras,
  NOMBRE_DEL_AVISO,
  PublicacionReporte,
  fechaCorta,
  numero,
  plural,
  porcentaje,
} from '../../core/reportes';
import { ReportesService } from '../../core/reportes.service';

// Paso A10: Alcance, igual que pages/reportes/AlcancePage.tsx de la web (antes eran datos de ejemplo).
// Cuánta gente ve los remates, cuáles interesan más y si se leen los avisos y anuncios (GET /reportes).
// El analista no entra al catálogo: de cada remate ve el nombre (en la web el admin además lo abre).
@Component({
  selector: 'app-alcance',
  templateUrl: './alcance.page.html',
  styleUrls: ['./alcance.page.scss'],
  standalone: false,
})
export class AlcancePage {
  readonly rep = inject(ReportesService);
  readonly CADA = CADA;
  readonly numero = numero;
  readonly plural = plural;
  readonly porcentaje = porcentaje;
  readonly fechaCorta = fechaCorta;

  readonly cifras = computed<CifraReporte[]>(() => {
    const reporte = this.rep.reporte();
    if (!reporte) {
      return [];
    }
    const { alcance, avisos, embudo } = reporte;
    return [
      {
        titulo: 'Personas alcanzadas',
        valor: numero(alcance.personas_que_vieron),
        nota: `${porcentaje(alcance.personas_que_vieron, embudo.activos)} de las cuentas activas`,
      },
      { titulo: 'Vistas', valor: numero(alcance.vistas), nota: `detalles de remates abiertos en ${this.rep.textoPeriodo()}` },
      { titulo: 'Guardados', valor: numero(alcance.guardados), nota: plural(alcance.quitados, 'quitado', 'quitados') },
      {
        titulo: 'Avisos leídos',
        valor: porcentaje(avisos.leidos, avisos.enviados),
        nota: `${numero(avisos.leidos)} de ${plural(avisos.enviados, 'aviso enviado', 'avisos enviados')}`,
      },
    ];
  });

  // La favorita del público
  readonly favoritas = computed<{ titulo: string; publicacion: PublicacionReporte | null; datos: string }[]>(() => {
    const reporte = this.rep.reporte();
    if (!reporte) {
      return [];
    }
    const vista = reporte.mas_vista;
    const guardada = reporte.mas_guardada;
    return [
      {
        titulo: 'La más vista',
        publicacion: vista,
        datos: vista
          ? `${vista.comuna ?? 'Sin comuna'} · ${plural(vista.vistas, 'vista', 'vistas')} de ${plural(vista.personas, 'persona', 'personas')}`
          : '',
      },
      {
        titulo: 'La más guardada',
        publicacion: guardada,
        datos: guardada
          ? `${guardada.comuna ?? 'Sin comuna'} · ${plural(guardada.guardados, 'persona la guardó', 'personas la guardaron')}`
          : '',
      },
    ];
  });

  readonly avisos = computed<FilaBarras[]>(() =>
    (this.rep.reporte()?.avisos.por_tipo ?? []).map((aviso) => ({
      nombre: NOMBRE_DEL_AVISO[aviso.tipo] ?? aviso.tipo,
      cantidad: aviso.enviados,
      nota: `${porcentaje(aviso.leidos, aviso.enviados)} leídos`,
    })),
  );

  readonly plataformas = computed<FilaBarras[]>(() => {
    const inicios = this.rep.reporte()?.inicios_por_plataforma ?? {};
    return [
      { nombre: 'Página web', cantidad: inicios['web'] ?? 0 },
      { nombre: 'App', cantidad: inicios['app'] ?? 0 },
      { nombre: 'Sin dato', cantidad: inicios['sin_dato'] ?? 0 },
    ].filter((fila) => fila.nombre !== 'Sin dato' || fila.cantidad > 0);
  });

  readonly totalInicios = computed(() =>
    Object.values(this.rep.reporte()?.inicios_por_plataforma ?? {}).reduce((suma, n) => suma + n, 0),
  );
}
