import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OpinionesPage } from './opiniones.page';

const routes: Routes = [
  {
    path: '',
    component: OpinionesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OpinionesPageRoutingModule {}
