import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { PublicacionDetallePageRoutingModule } from './publicacion-detalle-routing.module';

import { PublicacionDetallePage } from './publicacion-detalle.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PublicacionDetallePageRoutingModule
  ],
  declarations: [PublicacionDetallePage]
})
export class PublicacionDetallePageModule {}
