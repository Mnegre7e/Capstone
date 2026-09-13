import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DetallePropiedadPageRoutingModule } from './detalle-propiedad-routing.module';
import { DetallePropiedadPage } from './detalle-propiedad.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    DetallePropiedadPageRoutingModule
  ],
  declarations: [DetallePropiedadPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DetallePropiedadPageModule {}