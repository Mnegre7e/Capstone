import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PagoResultadoPage } from './pago-resultado.page';

const routes: Routes = [{ path: '', component: PagoResultadoPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagoResultadoPageRoutingModule {}
