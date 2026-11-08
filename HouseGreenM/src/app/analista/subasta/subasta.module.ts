import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { SubastaPageRoutingModule } from './subasta-routing.module';
import { SubastaPage } from './subasta.page';

// Paso A10: con las piezas de Reportes (CompartidoModule), igual que la web
@NgModule({
  imports: [CommonModule, IonicModule, CompartidoModule, SubastaPageRoutingModule],
  declarations: [SubastaPage],
})
export class SubastaPageModule {}
