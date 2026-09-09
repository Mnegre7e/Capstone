import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { PerfilConfiguracionPageRoutingModule } from './perfil-configuracion-routing.module';

import { PerfilConfiguracionPage } from './perfil-configuracion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PerfilConfiguracionPageRoutingModule
  ],
  declarations: [PerfilConfiguracionPage]
})
export class PerfilConfiguracionPageModule {}
