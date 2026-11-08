import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { PublicacionesPageRoutingModule } from './publicaciones-routing.module';
import { PublicacionesPage } from './publicaciones.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule, CompartidoModule, PublicacionesPageRoutingModule],
  declarations: [PublicacionesPage],
})
export class PublicacionesPageModule {}
