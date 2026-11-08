import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { PrivacidadPageRoutingModule } from './privacidad-routing.module';
import { PrivacidadPage } from './privacidad.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule, CompartidoModule, PrivacidadPageRoutingModule],
  declarations: [PrivacidadPage],
})
export class PrivacidadPageModule {}
