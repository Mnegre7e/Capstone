import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

export interface ActividadItem {
  id: number;
  titulo: string;
  ubicacion: string;
  fecha: string;
  tipo: 'departamento' | 'oficina' | 'casa' | 'terreno';
  guardo: boolean;
}

@Component({
  selector: 'app-actividad-usuario',
  templateUrl: './actividad-usuario.page.html',
  styleUrls: ['./actividad-usuario.page.scss'],
  standalone: false
})
export class ActividadUsuarioPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  userId!: number;
  tabActiva: 'vio' | 'guardo' = 'vio';

  usuario = {
    id: 1,
    nombre: 'Camila Rojas',
    email: 'camila.rojas@ejemplo.cl',
    iniciales: 'CR',
    fechaRegistro: '12 sep',
    ultimaActividad: 'hoy 09:42',
    vistasCount: 14,
    guardadosCount: 3,
    sugerenciasCount: 1
  };

  actividades: ActividadItem[] = [
    {
      id: 101,
      titulo: 'Departamento 2D 1B',
      ubicacion: 'Santiago Centro',
      fecha: 'hoy 09:42',
      tipo: 'departamento',
      guardo: true
    },
    {
      id: 102,
      titulo: 'Oficina',
      ubicacion: 'Providencia',
      fecha: 'hoy 09:30',
      tipo: 'oficina',
      guardo: true
    },
    {
      id: 103,
      titulo: 'Departamento 1D 1B',
      ubicacion: 'Estación Central',
      fecha: 'ayer 21:15',
      tipo: 'departamento',
      guardo: false
    },
    {
      id: 104,
      titulo: 'Casa 3D 2B',
      ubicacion: 'Maipú',
      fecha: 'mié 23 sep',
      tipo: 'casa',
      guardo: true
    },
    {
      id: 105,
      titulo: 'Terreno',
      ubicacion: 'Puente Alto',
      fecha: 'mar 22 sep',
      tipo: 'terreno',
      guardo: false
    }
  ];

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.userId = Number(idParam);
    }
  }

  get primerNombre(): string {
    return this.usuario.nombre.split(' ')[0];
  }

  get actividadesFiltradas(): ActividadItem[] {
    if (this.tabActiva === 'guardo') {
      return this.actividades.filter(a => a.guardo);
    }
    return this.actividades;
  }

  setTab(tab: 'vio' | 'guardo') {
    this.tabActiva = tab;
  }

  getIconoPropiedad(tipo: string): string {
    switch (tipo) {
      case 'departamento': return 'business-outline';
      case 'oficina': return 'briefcase-outline';
      case 'casa': return 'home-outline';
      case 'terreno': return 'map-outline';
      default: return 'business-outline';
    }
  }

 
  enviarAnuncio() {
    this.router.navigate(['/anuncio-destinatario'], { 
      queryParams: { userId: this.userId } 
    });
  }
}