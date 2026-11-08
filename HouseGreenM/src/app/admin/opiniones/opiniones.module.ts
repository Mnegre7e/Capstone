import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { OpinionesPageRoutingModule } from './opiniones-routing.module';
import { OpinionesPage } from './opiniones.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, OpinionesPageRoutingModule],
  declarations: [OpinionesPage],
})
export class OpinionesPageModule {}
