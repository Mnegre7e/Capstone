import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ActividadUsuarioPage } from './actividad-usuario.page';

const routes: Routes = [
  {
    path: '',
    component: ActividadUsuarioPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ActividadUsuarioPageRoutingModule {}
