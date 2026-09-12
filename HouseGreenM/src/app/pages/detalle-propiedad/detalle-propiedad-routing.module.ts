import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DetallePropiedadPage } from './detalle-propiedad.page';

const routes: Routes = [
  {
    path: '',
    component: DetallePropiedadPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DetallePropiedadPageRoutingModule {}
