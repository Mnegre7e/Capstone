import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { AdminHomePageRoutingModule } from './admin-home-routing.module';
import { AdminHomePage } from './admin-home.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule, CompartidoModule, AdminHomePageRoutingModule],
  declarations: [AdminHomePage],
})
export class AdminHomePageModule {}
