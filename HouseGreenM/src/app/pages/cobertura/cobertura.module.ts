import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { CoberturaPageRoutingModule } from './cobertura-routing.module';

import { CoberturaPage } from './cobertura.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CoberturaPageRoutingModule
  ],
  declarations: [CoberturaPage]
})
export class CoberturaPageModule {}
