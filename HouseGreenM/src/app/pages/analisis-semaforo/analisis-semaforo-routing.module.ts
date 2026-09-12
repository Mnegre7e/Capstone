import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AnalisisSemaforoPage } from './analisis-semaforo.page';

const routes: Routes = [
  {
    path: '',
    component: AnalisisSemaforoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnalisisSemaforoPageRoutingModule {}
