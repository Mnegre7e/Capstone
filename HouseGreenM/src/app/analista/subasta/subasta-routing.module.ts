import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SubastaPage } from './subasta.page';

const routes: Routes = [
  {
    path: '',
    component: SubastaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SubastaPageRoutingModule {}
