import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NuevoAnuncioPage } from './nuevo-anuncio.page';

const routes: Routes = [
  {
    path: '',
    component: NuevoAnuncioPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NuevoAnuncioPageRoutingModule {}
