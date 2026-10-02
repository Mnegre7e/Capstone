import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { ClasificacionesPageRoutingModule } from './clasificaciones-routing.module';

import { ClasificacionesPage } from './clasificaciones.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ClasificacionesPageRoutingModule
  ],
  declarations: [ClasificacionesPage]
})
export class ClasificacionesPageModule {}
