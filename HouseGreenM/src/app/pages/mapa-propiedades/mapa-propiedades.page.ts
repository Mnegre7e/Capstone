import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

export interface PropiedadMapa {
  id: number;
  titulo: string;
  tipo: string;
  precioTexto: string;
  precioCompleto: number;
  superficie: number;
  dormitorios: number;
  banos: number;
  fechaRemate: string;
  horaRemate: string;
  comuna: string;
  riesgoGlobal: 'bajo' | 'medio' | 'alto';
  top: string;
  left: string;
}

@Component({
  selector: 'app-mapa-propiedades',
  templateUrl: './mapa-propiedades.page.html',
  styleUrls: ['./mapa-propiedades.page.scss'],
  standalone: false
})
export class MapaPropiedadesPage implements OnInit {

  private router = inject(Router);
  private location = inject(Location);

  comunas: string[] = ['Todas', 'Santiago', 'Providencia', 'Ñuñoa'];
  comunaSeleccionada: string = 'Santiago';

  propiedades: PropiedadMapa[] = [
    {
      id: 1,
      titulo: 'Departamento 2D 1B',
      tipo: 'Departamento',
      precioTexto: '$42M',
      precioCompleto: 42000000,
      superficie: 48,
      dormitorios: 2,
      banos: 1,
      fechaRemate: 'vie 2 oct',
      horaRemate: '10:00',
      comuna: 'Santiago',
      riesgoGlobal: 'bajo',
      top: '50%',
      left: '48%'
    },
    {
      id: 2,
      titulo: 'Departamento 1D 1B',
      tipo: 'Departamento',
      precioTexto: '$38,5M',
      precioCompleto: 38500000,
      superficie: 36,
      dormitorios: 1,
      banos: 1,
      fechaRemate: 'lun 5 oct',
      horaRemate: '11:30',
      comuna: 'Santiago',
      riesgoGlobal: 'medio',
      top: '38%',
      left: '26%'
    },
    {
      id: 3,
      titulo: 'Oficina Central Alameda',
      tipo: 'Oficina',
      precioTexto: '$55M',
      precioCompleto: 55000000,
      superficie: 60,
      dormitorios: 0,
      banos: 2,
      fechaRemate: 'mar 6 oct',
      horaRemate: '12:00',
      comuna: 'Santiago',
      riesgoGlobal: 'bajo',
      top: '35%',
      left: '74%'
    },
    {
      id: 4,
      titulo: 'Departamento 3D 2B',
      tipo: 'Departamento',
      precioTexto: '$47M',
      precioCompleto: 47000000,
      superficie: 72,
      dormitorios: 3,
      banos: 2,
      fechaRemate: 'mié 7 oct',
      horaRemate: '10:30',
      comuna: 'Santiago',
      riesgoGlobal: 'medio',
      top: '61%',
      left: '75%'
    },
    {
      id: 5,
      titulo: 'Studio Centro',
      tipo: 'Departamento',
      precioTexto: '$29,9M',
      precioCompleto: 29900000,
      superficie: 28,
      dormitorios: 1,
      banos: 1,
      fechaRemate: 'jue 8 oct',
      horaRemate: '15:00',
      comuna: 'Santiago',
      riesgoGlobal: 'alto',
      top: '66%',
      left: '33%'
    }
  ];

  propiedadSeleccionada: PropiedadMapa | null = null;

  ngOnInit() {
    this.propiedadSeleccionada = this.propiedades[0];
  }

  goBack() {
    this.location.back();
  }

  get propiedadesFiltradas(): PropiedadMapa[] {
    if (this.comunaSeleccionada === 'Todas') {
      return this.propiedades;
    }
    return this.propiedades.filter(p => p.comuna === this.comunaSeleccionada);
  }

  seleccionarComuna(comuna: string) {
    this.comunaSeleccionada = comuna;
    const filtradas = this.propiedadesFiltradas;
    if (filtradas.length > 0) {
      this.propiedadSeleccionada = filtradas[0];
    } else {
      this.propiedadSeleccionada = null;
    }
  }

  seleccionarPropiedad(prop: PropiedadMapa) {
    this.propiedadSeleccionada = prop;
  }

  verDetalle(prop: PropiedadMapa) {
    this.router.navigate(['/detalle-propiedad', prop.id]);
  }

  formatearMoneda(valor: number): string {
    if (!valor) return '$0';
    return '$' + valor.toLocaleString('es-CL');
  }
}