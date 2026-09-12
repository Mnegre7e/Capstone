import { NgModule } from '@angular/core';
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
  declarations: [PropiedadesGuardadasPage]
})
export class PropiedadesGuardadasPageModule {}
