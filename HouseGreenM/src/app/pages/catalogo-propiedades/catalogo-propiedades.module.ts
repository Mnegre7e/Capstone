import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CatalogoPropiedadesPageRoutingModule } from './catalogo-propiedades-routing.module';
import { CatalogoPropiedadesPage } from './catalogo-propiedades.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    CatalogoPropiedadesPageRoutingModule
  ],
  declarations: [CatalogoPropiedadesPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CatalogoPropiedadesPageModule {}