import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CargasPage } from './cargas.page';

const routes: Routes = [
  {
    path: '',
    component: CargasPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CargasPageRoutingModule {}
