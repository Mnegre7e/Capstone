import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { AnuncioDestinatarioPageRoutingModule } from './anuncio-destinatario-routing.module';

import { AnuncioDestinatarioPage } from './anuncio-destinatario.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AnuncioDestinatarioPageRoutingModule
  ],
  declarations: [AnuncioDestinatarioPage]
})
export class AnuncioDestinatarioPageModule {}
