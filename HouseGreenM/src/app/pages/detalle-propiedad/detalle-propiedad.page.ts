import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

export interface PropiedadDetalle {
  id: number;
  titulo: string;
  precio: number;
  ubicacion: string;
  imagen: string;
  estado: string;
  descripcion: string;
  tipo: string;
  habitaciones: number;
  banos: number;
  superficie: number;
}

@Component({
  selector: 'app-detalle-propiedad',
  templateUrl: './detalle-propiedad.page.html',
  styleUrls: ['./detalle-propiedad.page.scss'],
  standalone: false
})
export class DetallePropiedadPage implements OnInit {

  private route = inject(ActivatedRoute);

  propiedadId: number | null = null;
  propiedad: PropiedadDetalle | null = null;

  // Mock de datos alineado con el catálogo
  private listaPropiedades: PropiedadDetalle[] = [
    {
      id: 1,
      titulo: 'Departamento en Santiago Centro',
      precio: 45000000,
      ubicacion: 'Santiago, RM',
      imagen: 'https://ionicframework.com/docs/img/demos/card-media.png',
      estado: 'Oportunidad',
      descripcion: 'Excelente departamento céntrico con gran conectividad a transporte público y zonas comerciales. Ideal para inversión de remate.',
      tipo: 'Departamento',
      habitaciones: 2,
      banos: 1,
      superficie: 55
    },
    {
      id: 2,
      titulo: 'Casa Habitación Providencia',
      precio: 120000000,
      ubicacion: 'Providencia, RM',
      imagen: 'https://ionicframework.com/docs/img/demos/card-media.png',
      estado: 'En Evaluación',
      descripcion: 'Amplia casa residencial de dos pisos en sector consolidado de Providencia. Cuenta con patio interior y espacio para estacionamiento.',
      tipo: 'Casa',
      habitaciones: 4,
      banos: 3,
      superficie: 140
    }
  ];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.propiedadId = Number(params['id']);
        this.cargarDetalle(this.propiedadId);
      } else {
        this.propiedad = this.listaPropiedades[0];
      }
    });
  }

  cargarDetalle(id: number) {
    const encontrada = this.listaPropiedades.find(p => p.id === id);
    this.propiedad = encontrada || this.listaPropiedades[0];
  }
}