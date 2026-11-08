import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { CompartidoModule } from '../../compartido/compartido.module';
import { ContactoPageRoutingModule } from './contacto-routing.module';
import { ContactoPage } from './contacto.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, CompartidoModule, ContactoPageRoutingModule],
  declarations: [ContactoPage],
})
export class ContactoPageModule {}
