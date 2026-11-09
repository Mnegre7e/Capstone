import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { CargasPageRoutingModule } from './cargas-routing.module';
import { CargasPage } from './cargas.page';

// Paso A13: herramienta del administrador que antes estaba solo en la web
@NgModule({
  imports: [CommonModule, IonicModule, RouterModule, CompartidoModule, CargasPageRoutingModule],
  declarations: [CargasPage],
})
export class CargasPageModule {}
