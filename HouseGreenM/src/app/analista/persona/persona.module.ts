import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { PersonaPageRoutingModule } from './persona-routing.module';
import { PersonaPage } from './persona.page';

// Paso A14: la ficha de una persona en Reportes (solo el administrador), con las piezas de Reportes
@NgModule({
  imports: [CommonModule, IonicModule, RouterModule, CompartidoModule, PersonaPageRoutingModule],
  declarations: [PersonaPage],
})
export class PersonaPageModule {}
