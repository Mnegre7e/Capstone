import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PropiedadesGuardadasPage } from './propiedades-guardadas.page';

const routes: Routes = [
  {
    path: '',
    component: PropiedadesGuardadasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PropiedadesGuardadasPageRoutingModule {}
