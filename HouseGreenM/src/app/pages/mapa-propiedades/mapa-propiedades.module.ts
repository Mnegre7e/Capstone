import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { MapaPropiedadesPageRoutingModule } from './mapa-propiedades-routing.module';
import { MapaPropiedadesPage } from './mapa-propiedades.page';
import { MapaRematesComponent } from './mapa-remates.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, MapaPropiedadesPageRoutingModule],
  declarations: [MapaPropiedadesPage, MapaRematesComponent],
})
export class MapaPropiedadesPageModule {}
