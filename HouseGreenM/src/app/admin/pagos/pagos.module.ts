import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { PagosPageRoutingModule } from './pagos-routing.module';
import { PagosPage } from './pagos.page';

// Paso A13: herramienta del administrador que antes estaba solo en la web
@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, PagosPageRoutingModule],
  declarations: [PagosPage],
})
export class PagosPageModule {}
