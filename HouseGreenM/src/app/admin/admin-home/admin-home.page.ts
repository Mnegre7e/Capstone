import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.page.html',
  styleUrls: ['./admin-home.page.scss'],
  standalone: false
})
export class AdminHomePage {
  private router = inject(Router);

  irAPublicaciones() {
    this.router.navigate(['/admin/publicaciones']);
  }

  verDetallePublicacion(id: number) {
    this.router.navigate(['/admin/publicaciones', id]);
  }
}