import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { EditarPublicacionPageRoutingModule } from './editar-publicacion-routing.module';

import { EditarPublicacionPage } from './editar-publicacion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EditarPublicacionPageRoutingModule
  ],
  declarations: [EditarPublicacionPage]
})
export class EditarPublicacionPageModule {}
