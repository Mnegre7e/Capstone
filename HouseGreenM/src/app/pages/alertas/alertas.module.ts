import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { AlertasPageRoutingModule } from './alertas-routing.module';
import { AlertasPage } from './alertas.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, AlertasPageRoutingModule],
  declarations: [AlertasPage],
})
export class AlertasPageModule {}
