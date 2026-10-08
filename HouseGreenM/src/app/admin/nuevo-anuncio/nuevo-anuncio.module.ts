import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { NuevoAnuncioPageRoutingModule } from './nuevo-anuncio-routing.module';

import { NuevoAnuncioPage } from './nuevo-anuncio.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NuevoAnuncioPageRoutingModule
  ],
  declarations: [NuevoAnuncioPage]
})
export class NuevoAnuncioPageModule {}
