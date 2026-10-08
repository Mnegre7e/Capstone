import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { AlcancePageRoutingModule } from './alcance-routing.module';

import { AlcancePage } from './alcance.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AlcancePageRoutingModule
  ],
  declarations: [AlcancePage]
})
export class AlcancePageModule {}
