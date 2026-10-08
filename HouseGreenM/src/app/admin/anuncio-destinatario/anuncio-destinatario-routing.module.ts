import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AnuncioDestinatarioPage } from './anuncio-destinatario.page';

const routes: Routes = [
  {
    path: '',
    component: AnuncioDestinatarioPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnuncioDestinatarioPageRoutingModule {}
