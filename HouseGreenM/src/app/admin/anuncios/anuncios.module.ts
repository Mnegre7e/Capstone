import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { AnunciosPageRoutingModule } from './anuncios-routing.module';
import { AnunciosPage } from './anuncios.page';
import { ElegirOpcionComponent } from './elegir-opcion.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, AnunciosPageRoutingModule],
  declarations: [AnunciosPage, ElegirOpcionComponent],
})
export class AnunciosPageModule {}
