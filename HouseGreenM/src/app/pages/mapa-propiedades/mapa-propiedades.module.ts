import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { MapaPropiedadesPageRoutingModule } from './mapa-propiedades-routing.module';

import { MapaPropiedadesPage } from './mapa-propiedades.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MapaPropiedadesPageRoutingModule
  ],
  declarations: [MapaPropiedadesPage]
})
export class MapaPropiedadesPageModule {}
