import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { UsuariosPageRoutingModule } from './usuarios-routing.module';
import { UsuariosPage } from './usuarios.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, UsuariosPageRoutingModule],
  declarations: [UsuariosPage],
})
export class UsuariosPageModule {}
