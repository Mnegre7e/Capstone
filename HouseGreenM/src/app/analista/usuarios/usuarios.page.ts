import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  standalone: false
})
export class UsuariosPage {
  private router = inject(Router);

  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}