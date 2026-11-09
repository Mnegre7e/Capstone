import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { SemaforoPageRoutingModule } from './semaforo-routing.module';
import { SemaforoPage } from './semaforo.page';

// Paso A13: herramienta del administrador que antes estaba solo en la web
@NgModule({
  imports: [CommonModule, IonicModule, RouterModule, CompartidoModule, SemaforoPageRoutingModule],
  declarations: [SemaforoPage],
})
export class SemaforoPageModule {}
