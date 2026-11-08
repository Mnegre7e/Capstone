import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { RecuperarClavePageRoutingModule } from './recuperar-clave-routing.module';
import { RecuperarClavePage } from './recuperar-clave.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, RecuperarClavePageRoutingModule],
  declarations: [RecuperarClavePage],
})
export class RecuperarClavePageModule {}
