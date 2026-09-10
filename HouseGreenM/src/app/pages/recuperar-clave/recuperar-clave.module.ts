import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


import { RecuperarClavePageRoutingModule } from './recuperar-clave-routing.module';

import { RecuperarClavePage } from './recuperar-clave.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,

    RecuperarClavePageRoutingModule
  ],
  declarations: [RecuperarClavePage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RecuperarClavePageModule {}
