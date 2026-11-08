import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { PagoResultadoPageRoutingModule } from './pago-resultado-routing.module';
import { PagoResultadoPage } from './pago-resultado.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule, CompartidoModule, PagoResultadoPageRoutingModule],
  declarations: [PagoResultadoPage],
})
export class PagoResultadoPageModule {}
