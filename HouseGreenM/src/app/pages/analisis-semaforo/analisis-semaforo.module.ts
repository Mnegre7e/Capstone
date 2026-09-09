import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { AnalisisSemaforoPageRoutingModule } from './analisis-semaforo-routing.module';

import { AnalisisSemaforoPage } from './analisis-semaforo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AnalisisSemaforoPageRoutingModule
  ],
  declarations: [AnalisisSemaforoPage]
})
export class AnalisisSemaforoPageModule {}
