import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { PremiumPageRoutingModule } from './premium-routing.module';
import { PremiumPage } from './premium.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule, CompartidoModule, PremiumPageRoutingModule],
  declarations: [PremiumPage],
})
export class PremiumPageModule {}
