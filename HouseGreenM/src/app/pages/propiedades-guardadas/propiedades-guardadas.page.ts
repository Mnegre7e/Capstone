import { Component } from '@angular/core';

@Component({
  selector: 'app-propiedades-guardadas',
  templateUrl: './propiedades-guardadas.page.html',
  styleUrls: ['./propiedades-guardadas.page.scss'],
  standalone: false
})
export class PropiedadesGuardadasPage {

  favoritos = [
    {
      id: 1,
      titulo: 'Departamento Santiago Centro',
      comuna: 'Santiago',
      precioMinimo: 42000000,
      fechaRemate: '24 Sep 2026',
      imagen: 'assets/icon/logo-housegreen.svg'
    },
    {
      id: 2,
      titulo: 'Casa Habitación Providencia',
      comuna: 'Providencia',
      precioMinimo: 98000000,
      fechaRemate: '02 Oct 2026',
      imagen: 'assets/icon/logo-housegreen.svg'
    }
  ];

  eliminarFavorito(id: number) {
    this.favoritos = this.favoritos.filter(item => item.id !== id);
  }
}