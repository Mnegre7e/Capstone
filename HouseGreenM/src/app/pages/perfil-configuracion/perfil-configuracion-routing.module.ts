import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PerfilConfiguracionPage } from './perfil-configuracion.page';

const routes: Routes = [
  {
    path: '',
    component: PerfilConfiguracionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PerfilConfiguracionPageRoutingModule {}
