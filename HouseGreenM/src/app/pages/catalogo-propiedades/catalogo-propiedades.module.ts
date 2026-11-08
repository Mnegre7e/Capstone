import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { CatalogoPropiedadesPageRoutingModule } from './catalogo-propiedades-routing.module';
import { CatalogoPropiedadesPage } from './catalogo-propiedades.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, CatalogoPropiedadesPageRoutingModule],
  declarations: [CatalogoPropiedadesPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CatalogoPropiedadesPageModule {}
