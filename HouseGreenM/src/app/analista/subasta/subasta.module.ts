import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { SubastaPageRoutingModule } from './subasta-routing.module';

import { SubastaPage } from './subasta.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SubastaPageRoutingModule
  ],
  declarations: [SubastaPage]
})
export class SubastaPageModule {}
