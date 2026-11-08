import { Component, computed, inject, signal } from '@angular/core';

import { CADA, CifraReporte, Medida, numero, plural, porcentaje } from '../../core/reportes';
import { ReportesService } from '../../core/reportes.service';

// Paso A10: Resumen, igual que pages/reportes/ResumenPage.tsx de la web (antes eran datos de ejemplo).
// Lo más importante de las otras tres pantallas, de un vistazo (GET /reportes).
@Component({
  selector: 'app-resumen',
  templateUrl: './resumen.page.html',
  styleUrls: ['./resumen.page.scss'],
  standalone: false,
})
export class ResumenPage {
  readonly rep = inject(ReportesService);
  readonly CADA = CADA;
  readonly OPCIONES: Medida[] = ['vistas', 'guardados', 'registros', 'publicaciones'];
  readonly medida = signal<Medida>('vistas');

  readonly cifras = computed<CifraReporte[]>(() => {
    const reporte = this.rep.reporte();
    if (!reporte) {
      return [];
    }
    const { usuarios, subastas, alcance, embudo } = reporte;
    return [
      {
        titulo: 'Remates vigentes',
        valor: numero(subastas.vigentes),
        nota: `${plural(subastas.rematan_pronto, 'se remata', 'se rematan')} en los próximos 7 días`,
      },
      {
        titulo: 'Personas registradas',
        valor: numero(usuarios.total),
        nota: `${plural(usuarios.nuevos, 'nueva', 'nuevas')} en ${this.rep.textoPeriodo()}`,
      },
      {
        titulo: 'Personas que vieron remates',
        valor: numero(alcance.personas_que_vieron),
        nota: `${porcentaje(alcance.personas_que_vieron, embudo.activos)} de las cuentas activas`,
      },
      {
        titulo: 'Guardados',
        valor: numero(alcance.guardados),
        nota: plural(alcance.quitados, 'favorito quitado', 'favoritos quitados'),
      },
    ];
  });
}
