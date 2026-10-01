import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { PROPIEDADES_CATALOGO, Propiedad } from '../data/propiedades_data';

@Component({
  selector: 'app-detalle-propiedad',
  templateUrl: './detalle-propiedad.page.html',
  styleUrls: ['./detalle-propiedad.page.scss'],
  standalone: false
})
export class DetallePropiedadPage implements OnInit {

  private route = inject(ActivatedRoute);
  private location = inject(Location);

  propiedad!: Propiedad;

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? +idParam : 1;

    const encontrada = PROPIEDADES_CATALOGO.find(p => p.id === id);
    this.propiedad = encontrada || PROPIEDADES_CATALOGO[0];
  }

  volver() {
    this.location.back();
  }

  toggleGuardar() {
    if (this.propiedad) {
      this.propiedad.guardado = !this.propiedad.guardado;
    }
  }

  formatearMoneda(valor: number): string {
    if (!valor) return '$0';
    return '$' + valor.toLocaleString('es-CL');
  }
}