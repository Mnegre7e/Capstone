import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-resumen',
  templateUrl: './resumen.page.html',
  styleUrls: ['./resumen.page.scss'],
  standalone: false
})
export class ResumenPage {
  private router = inject(Router);
  periodo: string = '30d';

  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}