import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { UsuariosPageRoutingModule } from './usuarios-routing.module';
import { UsuariosPage } from './usuarios.page';

// Paso A10: con las piezas de Reportes (CompartidoModule), igual que la web
@NgModule({
  imports: [CommonModule, IonicModule, CompartidoModule, UsuariosPageRoutingModule],
  declarations: [UsuariosPage],
})
export class UsuariosPageModule {}
