import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { NosotrosPageRoutingModule } from './nosotros-routing.module';
import { NosotrosPage } from './nosotros.page';

// Paso 129: con el encabezado de la app (CompartidoModule), igual que las demás pantallas
@NgModule({
  imports: [CommonModule, IonicModule, CompartidoModule, NosotrosPageRoutingModule],
  declarations: [NosotrosPage],
})
export class NosotrosPageModule {}
