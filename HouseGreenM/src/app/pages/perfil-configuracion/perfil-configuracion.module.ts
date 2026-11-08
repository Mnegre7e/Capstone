import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { PerfilConfiguracionPageRoutingModule } from './perfil-configuracion-routing.module';
import { PerfilConfiguracionPage } from './perfil-configuracion.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, PerfilConfiguracionPageRoutingModule],
  declarations: [PerfilConfiguracionPage],
})
export class PerfilConfiguracionPageModule {}
