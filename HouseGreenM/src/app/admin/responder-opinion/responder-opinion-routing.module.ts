import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ResponderOpinionPage } from './responder-opinion.page';

const routes: Routes = [
  {
    path: '',
    component: ResponderOpinionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ResponderOpinionPageRoutingModule {}
