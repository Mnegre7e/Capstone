import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { DetallePropiedadPageRoutingModule } from './detalle-propiedad-routing.module';
import { DetallePropiedadPage } from './detalle-propiedad.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, DetallePropiedadPageRoutingModule],
  declarations: [DetallePropiedadPage],
})
export class DetallePropiedadPageModule {}
