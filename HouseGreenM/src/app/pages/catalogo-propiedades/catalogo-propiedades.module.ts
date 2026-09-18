import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { CatalogoPropiedadesPageRoutingModule } from './catalogo-propiedades-routing.module';
import { CatalogoPropiedadesPage } from './catalogo-propiedades.page';
import { RouterModule } from '@angular/router';
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    CatalogoPropiedadesPageRoutingModule
  ],
  declarations: [CatalogoPropiedadesPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CatalogoPropiedadesPageModule {}