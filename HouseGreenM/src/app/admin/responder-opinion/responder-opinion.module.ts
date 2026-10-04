import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { ResponderOpinionPageRoutingModule } from './responder-opinion-routing.module';

import { ResponderOpinionPage } from './responder-opinion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ResponderOpinionPageRoutingModule
  ],
  declarations: [ResponderOpinionPage]
})
export class ResponderOpinionPageModule {}
