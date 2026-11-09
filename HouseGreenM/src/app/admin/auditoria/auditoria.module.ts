import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { AuditoriaPageRoutingModule } from './auditoria-routing.module';
import { AuditoriaPage } from './auditoria.page';

// Paso A13: herramienta del administrador que antes estaba solo en la web
@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, AuditoriaPageRoutingModule],
  declarations: [AuditoriaPage],
})
export class AuditoriaPageModule {}
