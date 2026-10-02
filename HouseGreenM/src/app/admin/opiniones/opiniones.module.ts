import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { OpinionesPageRoutingModule } from './opiniones-routing.module';

import { OpinionesPage } from './opiniones.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OpinionesPageRoutingModule
  ],
  declarations: [OpinionesPage]
})
export class OpinionesPageModule {}
