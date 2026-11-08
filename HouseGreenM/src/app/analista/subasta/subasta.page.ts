import { Component, computed, inject } from '@angular/core';

import { CATEGORIAS, categoriaDeTipo } from '../../core/remates';
import { CADA, CifraReporte, FilaBarras, numero, porcentaje } from '../../core/reportes';
import { ReportesService } from '../../core/reportes.service';

// Paso A10: Subastas, igual que pages/reportes/SubastasPage.tsx de la web (antes eran datos de ejemplo).
// Los remates que hay en HouseGreen: cuántos, dónde, de qué tipo y su semáforo (GET /reportes).
@Component({
  selector: 'app-subasta',
  templateUrl: './subasta.page.html',
  styleUrls: ['./subasta.page.scss'],
  standalone: false,
})
export class SubastaPage {
  readonly rep = inject(ReportesService);
  readonly CADA = CADA;

  readonly cifras = computed<CifraReporte[]>(() => {
    const reporte = this.rep.reporte();
    if (!reporte) {
      return [];
    }
    const { subastas, publicaciones } = reporte;
    return [
      { titulo: 'Remates vigentes', valor: numero(subastas.vigentes), nota: 'en el catálogo hoy' },
      {
        titulo: 'Publicados',
        valor: numero(publicaciones.nuevas),
        nota: `remates nuevos en ${this.rep.textoPeriodo()}`,
      },
      {
        titulo: 'Se rematan pronto',
        valor: numero(subastas.rematan_pronto),
        nota: 'en los próximos 7 días',
      },
      {
        titulo: 'Precio comparado',
        valor: porcentaje(subastas.revisadas, subastas.vigentes),
        nota: `${numero(subastas.revisadas)} de ${numero(subastas.vigentes)} frente a su comuna`,
      },
    ];
  });

  // Los tipos vienen como los escribe el sitio ("Casa", "Sitio", "Lote"...): se agrupan como en el catálogo
  readonly filasPorTipo = computed<FilaBarras[]>(() => {
    const reporte = this.rep.reporte();
    if (!reporte) {
      return [];
    }
    const porCategoria = new Map<string, number>();
    for (const [tipo, cantidad] of Object.entries(reporte.subastas.por_tipo)) {
      const categoria = categoriaDeTipo(tipo);
      porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + cantidad);
    }
    return CATEGORIAS.map((c) => ({ nombre: c.nombre, cantidad: porCategoria.get(c.valor) ?? 0 }))
      .filter((fila) => fila.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad);
  });
}
