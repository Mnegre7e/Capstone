import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MapaPropiedadesPage } from './mapa-propiedades.page';

const routes: Routes = [
  {
    path: '',
    component: MapaPropiedadesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MapaPropiedadesPageRoutingModule {}
