import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { CatalogoPropiedadesPageRoutingModule } from './catalogo-propiedades-routing.module';

import { CatalogoPropiedadesPage } from './catalogo-propiedades.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CatalogoPropiedadesPageRoutingModule
  ],
  declarations: [CatalogoPropiedadesPage]
})
export class CatalogoPropiedadesPageModule {}
