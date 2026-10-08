import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
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
  declarations: [MapaPropiedadesPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MapaPropiedadesPageModule {}