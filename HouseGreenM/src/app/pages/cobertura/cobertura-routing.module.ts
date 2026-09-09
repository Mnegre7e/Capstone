import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CoberturaPage } from './cobertura.page';

const routes: Routes = [
  {
    path: '',
    component: CoberturaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CoberturaPageRoutingModule {}
