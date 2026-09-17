import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';

import { PropiedadesGuardadasPageRoutingModule } from './propiedades-guardadas-routing.module';
import { PropiedadesGuardadasPage } from './propiedades-guardadas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PropiedadesGuardadasPageRoutingModule
  ],
  declarations: [PropiedadesGuardadasPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PropiedadesGuardadasPageModule {}