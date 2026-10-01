import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PublicacionDetallePage } from './publicacion-detalle.page';

const routes: Routes = [
  {
    path: '',
    component: PublicacionDetallePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PublicacionDetallePageRoutingModule {}
