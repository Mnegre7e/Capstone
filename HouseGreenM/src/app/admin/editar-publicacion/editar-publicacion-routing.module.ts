import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EditarPublicacionPage } from './editar-publicacion.page';

const routes: Routes = [
  {
    path: '',
    component: EditarPublicacionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EditarPublicacionPageRoutingModule {}
