import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-alcance',
  templateUrl: './alcance.page.html',
  styleUrls: ['./alcance.page.scss'],
  standalone: false
})
export class AlcancePage {
  private router = inject(Router);
  periodo: string = '7d';

  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}