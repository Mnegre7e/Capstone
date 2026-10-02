import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';

// 1. Interfaces locales para estructurar los datos
export interface Foto {
  id: number;
  url: string;
  etiqueta: string;
  esPortada: boolean;
}

export interface Publicacion {
  id: number;
  titulo: string;
  ubicacion: string;
  minimo: string;
  riesgo: 'Bajo' | 'Medio' | 'Alto';
  vistas: number;
  guardados: number;
  descripcion: string;
  fotos: Foto[];
}

// 2. Lista de las 4 publicaciones locales (Mock Data)
const LISTA_PUBLICACIONES: Publicacion[] = [
  {
    id: 1,
    titulo: 'Departamento 2D 1B',
    ubicacion: 'Santiago Centro',
    minimo: '$42.000.000',
    riesgo: 'Bajo',
    vistas: 312,
    guardados: 28,
    descripcion: 'Departamento de 48 m² útiles en piso 8, con 2 dormitorios, 1 baño, cocina cerrada y logia. Edificio de 2012 con conserjería y ascensores, cerca de comercio y transporte público. Para participar se exige una garantía de $4.200.000 (10 % del mínimo).',
    fotos: [
      { id: 1, url: 'assets/icon/favicon.png', etiqueta: 'Portada', esPortada: true },
      { id: 2, url: 'assets/icon/favicon.png', etiqueta: 'Living', esPortada: false },
      { id: 3, url: 'assets/icon/favicon.png', etiqueta: 'Cocina', esPortada: false },
      { id: 4, url: 'assets/icon/favicon.png', etiqueta: 'Dormitorio', esPortada: false },
      { id: 5, url: 'assets/icon/favicon.png', etiqueta: 'Baño', esPortada: false },
      { id: 6, url: 'assets/icon/favicon.png', etiqueta: 'Vista', esPortada: false }
    ]
  },
  {
    id: 2,
    titulo: 'Casa 3D 2B',
    ubicacion: 'Maipú',
    minimo: '$65.000.000',
    riesgo: 'Medio',
    vistas: 241,
    guardados: 19,
    descripcion: 'Casa de 2 pisos con antejardín y patio trasero. 3 dormitorios amoblados, 2 baños completos y estacionamiento para 2 vehículos.',
    fotos: [
      { id: 1, url: 'assets/icon/favicon.png', etiqueta: 'Portada', esPortada: true },
      { id: 2, url: 'assets/icon/favicon.png', etiqueta: 'Fachada', esPortada: false },
      { id: 3, url: 'assets/icon/favicon.png', etiqueta: 'Patio', esPortada: false }
    ]
  },
  {
    id: 3,
    titulo: 'Oficina',
    ubicacion: 'Providencia',
    minimo: '$35.000.000',
    riesgo: 'Bajo',
    vistas: 188,
    guardados: 12,
    descripcion: 'Oficina comercial adaptada para servicios profesionales. Planta libre de 35 m² con 1 privado y 1 baño.',
    fotos: [
      { id: 1, url: 'assets/icon/favicon.png', etiqueta: 'Portada', esPortada: true },
      { id: 2, url: 'assets/icon/favicon.png', etiqueta: 'Planta libre', esPortada: false }
    ]
  },
  {
    id: 4,
    titulo: 'Departamento 1D 1B',
    ubicacion: 'Estación Central',
    minimo: '$28.000.000',
    riesgo: 'Alto',
    vistas: 164,
    guardados: 7,
    descripcion: 'Departamento ideal para inversión. 1 dormitorio en suite, cocina americana equipada y terraza con vista despejada.',
    fotos: [
      { id: 1, url: 'assets/icon/favicon.png', etiqueta: 'Portada', esPortada: true },
      { id: 2, url: 'assets/icon/favicon.png', etiqueta: 'Dormitorio', esPortada: false }
    ]
  }
];

@Component({
  selector: 'app-editar-publicacion',
  templateUrl: './editar-publicacion.page.html',
  styleUrls: ['./editar-publicacion.page.scss'],
  standalone: false
})
export class EditarPublicacionPage implements OnInit {
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);

  publicacionId: number = 1;
  propiedad: Publicacion = LISTA_PUBLICACIONES[0];

  fotos: Foto[] = [];
  descripcion: string = '';
  maxFotos: number = 15;
  maxCaracteres: number = 1000;

  ngOnInit() {
    // Lee el ID desde la ruta si existe (por ejemplo /editar-publicacion/2)
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.publicacionId = Number(idParam);
    }

    // Busca la publicación en el array local
    const encontrada = LISTA_PUBLICACIONES.find(p => p.id === this.publicacionId);
    if (encontrada) {
      this.propiedad = { ...encontrada };
      this.fotos = [...encontrada.fotos];
      this.descripcion = encontrada.descripcion;
    }
  }

  volver() {
    this.navCtrl.back();
  }

  eliminarFoto(index: number) {
    this.fotos.splice(index, 1);
    if (this.fotos.length > 0 && !this.fotos.some(f => f.esPortada)) {
      this.fotos[0].esPortada = true;
      this.fotos[0].etiqueta = 'Portada';
    }
  }

  agregarFoto() {
    if (this.fotos.length < this.maxFotos) {
      const nuevaFoto: Foto = {
        id: Date.now(),
        url: 'assets/icon/favicon.png',
        etiqueta: `Foto ${this.fotos.length + 1}`,
        esPortada: this.fotos.length === 0
      };
      this.fotos.push(nuevaFoto);
    }
  }

  guardarCambios() {
    // Actualiza el objeto simulado en memoria
    if (this.propiedad) {
      this.propiedad.fotos = this.fotos;
      this.propiedad.descripcion = this.descripcion;
    }

    console.log('Cambios guardados localmente para ID:', this.publicacionId, {
      fotos: this.fotos,
      descripcion: this.descripcion
    });

    this.volver();
  }
}