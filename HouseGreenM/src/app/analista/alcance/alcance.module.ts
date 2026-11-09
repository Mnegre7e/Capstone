import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { AlcancePageRoutingModule } from './alcance-routing.module';
import { AlcancePage } from './alcance.page';

// Paso A10: con las piezas de Reportes (CompartidoModule), igual que la web
@NgModule({
  imports: [CommonModule, IonicModule, RouterModule, CompartidoModule, AlcancePageRoutingModule],
  declarations: [AlcancePage],
})
export class AlcancePageModule {}
