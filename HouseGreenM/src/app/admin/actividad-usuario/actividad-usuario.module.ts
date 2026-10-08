import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { ActividadUsuarioPageRoutingModule } from './actividad-usuario-routing.module';

import { ActividadUsuarioPage } from './actividad-usuario.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ActividadUsuarioPageRoutingModule
  ],
  declarations: [ActividadUsuarioPage]
})
export class ActividadUsuarioPageModule {}
