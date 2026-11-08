import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { PublicacionDetallePageRoutingModule } from './publicacion-detalle-routing.module';
import { PublicacionDetallePage } from './publicacion-detalle.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, PublicacionDetallePageRoutingModule],
  declarations: [PublicacionDetallePage],
})
export class PublicacionDetallePageModule {}
