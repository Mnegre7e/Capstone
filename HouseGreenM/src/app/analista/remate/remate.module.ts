import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { RematePageRoutingModule } from './remate-routing.module';
import { RematePage } from './remate.page';

// Paso A10: con las piezas de Reportes (CompartidoModule), igual que la web
@NgModule({
  imports: [CommonModule, IonicModule, CompartidoModule, RematePageRoutingModule],
  declarations: [RematePage],
})
export class RematePageModule {}
