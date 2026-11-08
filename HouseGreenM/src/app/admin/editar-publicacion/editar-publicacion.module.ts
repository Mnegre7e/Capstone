import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { EditarPublicacionPageRoutingModule } from './editar-publicacion-routing.module';
import { EditarPublicacionPage } from './editar-publicacion.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, EditarPublicacionPageRoutingModule],
  declarations: [EditarPublicacionPage],
})
export class EditarPublicacionPageModule {}
