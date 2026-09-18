import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface Propiedad {
  id: number;
  titulo: string;
  ubicacion: string;
  precio: number;
  estado: string;
  imagen: string;
  tipo: string;
  habitaciones: number;
  banos: number;
  descripcion: string;
}

@Component({
  selector: 'app-detalle-propiedad',
  templateUrl: './detalle-propiedad.page.html',
  styleUrls: ['./detalle-propiedad.page.scss'],
  standalone: false
})
export class DetallePropiedadPage implements OnInit {

  listaPropiedades: Propiedad[] = [
    {
      id: 1,
      titulo: 'Departamento Santiago Centro',
      ubicacion: 'Santiago Centro, Región Metropolitana',
      precio: 42000000,
      estado: 'Remate Vigente',
      imagen: 'assets/icon/logo-housegreen.svg',
      tipo: 'Departamento',
      habitaciones: 2,
      banos: 1,
      descripcion: 'Excelente oportunidad de inversión en pleno centro de Santiago. Propiedad en remate judicial con alta plusvalía, cercana a estaciones de metro, comercio y servicios esenciales.'
    },
    {
      id: 2,
      titulo: 'Casa Habitación Providencia',
      ubicacion: 'Providencia, Región Metropolitana',
      precio: 98000000,
      estado: 'Remate Vigente',
      imagen: 'assets/icon/logo-housegreen.svg',
      tipo: 'Casa',
      habitaciones: 4,
      banos: 3,
      descripcion: 'Amplia casa residencial ubicada en sector consolidado de Providencia. Excelente conectividad, áreas verdes y gran potencial de remodelación.'
    },
    {
      id: 3,
      titulo: 'Oficina Comercial Las Condes',
      ubicacion: 'Las Condes, Región Metropolitana',
      precio: 65000000,
      estado: 'Próximo Remate',
      imagen: 'assets/icon/logo-housegreen.svg',
      tipo: 'Oficina',
      habitaciones: 2,
      banos: 2,
      descripcion: 'Moderna oficina comercial en eje corporativo de Las Condes. Incluye estacionamiento subterráneo y bodega.'
    },
    {
      id: 4,
      titulo: 'Terreno Urbano Maipú',
      ubicacion: 'Maipú, Región Metropolitana',
      precio: 35000000,
      estado: 'Remate Vigente',
      imagen: 'assets/icon/logo-housegreen.svg',
      tipo: 'Terreno',
      habitaciones: 0,
      banos: 0,
      descripcion: 'Terreno con uso de suelo mixto ideal para desarrollo habitacional o comercial en sector de alto crecimiento de Maipú.'
    }
  ];

  propiedad: Propiedad | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? parseInt(idParam, 10) : 1;
    this.propiedad = this.listaPropiedades.find(p => p.id === id) || this.listaPropiedades[0];
  }

  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined || isNaN(valor)) return '$0';
    return '$' + valor.toLocaleString('es-CL');
  }
}