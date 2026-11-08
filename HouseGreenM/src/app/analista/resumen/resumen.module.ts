import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { ResumenPageRoutingModule } from './resumen-routing.module';
import { ResumenPage } from './resumen.page';

// Paso A10: con las piezas de Reportes (CompartidoModule), igual que la web
@NgModule({
  imports: [CommonModule, IonicModule, CompartidoModule, ResumenPageRoutingModule],
  declarations: [ResumenPage],
})
export class ResumenPageModule {}
