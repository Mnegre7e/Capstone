import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RematePage } from './remate.page';

const routes: Routes = [
  {
    path: '',
    component: RematePage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RematePageRoutingModule {}
