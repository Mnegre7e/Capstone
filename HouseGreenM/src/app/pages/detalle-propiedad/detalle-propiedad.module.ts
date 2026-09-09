import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { DetallePropiedadPageRoutingModule } from './detalle-propiedad-routing.module';

import { DetallePropiedadPage } from './detalle-propiedad.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DetallePropiedadPageRoutingModule
  ],
  declarations: [DetallePropiedadPage]
})
export class DetallePropiedadPageModule {}
