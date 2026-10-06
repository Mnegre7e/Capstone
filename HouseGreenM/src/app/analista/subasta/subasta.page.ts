import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-subasta',
  templateUrl: './subasta.page.html',
  styleUrls: ['./subasta.page.scss'],
  standalone: false
})
export class SubastaPage {
  private router = inject(Router);

  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}