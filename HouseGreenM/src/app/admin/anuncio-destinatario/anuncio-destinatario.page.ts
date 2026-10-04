import { Component, inject, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-anuncio-destinatario',
  templateUrl: './anuncio-destinatario.page.html',
  styleUrls: ['./anuncio-destinatario.page.scss'],
  standalone: false
})
export class AnuncioDestinatarioPage implements OnInit {
  private location = inject(Location);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  tipoDestinatario: 'todos' | 'persona' | 'grupo' = 'grupo';
  subSegmento: 'vieron' | 'guardaron' = 'vieron';

  // Búsqueda y Selección de Persona
  busquedaPersona: string = '';
  personaSeleccionada: any = null;

  // Mock de personas registradas
  personasMock = [
    { id: 101, nombre: 'Juan Pérez', email: 'juan.perez@gmail.com', rut: '15.432.890-1' },
    { id: 102, nombre: 'María González', email: 'maria.g@gmail.com', rut: '18.765.432-K' },
    { id: 103, nombre: 'Carlos Silva', email: 'carlos.silva@outlook.com', rut: '12.345.678-9' },
    { id: 104, nombre: 'Ana Torres', email: 'ana.torres@gmail.com', rut: '19.876.543-2' }
  ];

  // Las 4 publicaciones del maquetado
  publicacionesMock = [
    { id: 1, titulo: 'Departamento 2D 1B', comuna: 'Santiago Centro', vistasTotales: 312, vistasUnicas: 187, guardados: 28 },
    { id: 2, titulo: 'Casa 3D 2B', comuna: 'Maipú', vistasTotales: 241, vistasUnicas: 140, guardados: 19 },
    { id: 3, titulo: 'Oficina', comuna: 'Providencia', vistasTotales: 188, vistasUnicas: 110, guardados: 12 },
    { id: 4, titulo: 'Departamento 1D 1B', comuna: 'Estación Central', vistasTotales: 164, vistasUnicas: 95, guardados: 7 }
  ];

  publicacionSeleccionada = this.publicacionesMock[0];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tipo']) {
        this.tipoDestinatario = params['tipo'];
      }
      const pubId = Number(params['pubId']);
      if (pubId) {
        const encontrada = this.publicacionesMock.find(p => p.id === pubId);
        if (encontrada) this.publicacionSeleccionada = encontrada;
      }
      if (params['sub']) {
        this.subSegmento = params['sub'] === 'guardaron' ? 'guardaron' : 'vieron';
      }
    });
  }

  // Filtrado reactivo de personas
  get personasFiltradas() {
    if (!this.busquedaPersona.trim()) return [];
    const q = this.busquedaPersona.toLowerCase();
    return this.personasMock.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.rut.toLowerCase().includes(q)
    );
  }

  seleccionarPersona(p: any) {
    this.personaSeleccionada = p;
    this.busquedaPersona = '';
  }

  limpiarPersona() {
    this.personaSeleccionada = null;
  }

  onPublicacionChange(id: any) {
    const encontrada = this.publicacionesMock.find(p => p.id === Number(id));
    if (encontrada) {
      this.publicacionSeleccionada = encontrada;
    }
  }

  get totalConteo(): number {
    if (this.tipoDestinatario === 'todos') return 248;
    if (this.tipoDestinatario === 'persona') return this.personaSeleccionada ? 1 : 0;
    return this.subSegmento === 'vieron' 
      ? this.publicacionSeleccionada.vistasUnicas 
      : this.publicacionSeleccionada.guardados;
  }

  volver() {
    this.location.back();
  }

  confirmarDestinatarios() {
    this.router.navigate(['/nuevo-anuncio'], {
      queryParams: {
        tipo: this.tipoDestinatario,
        sub: this.subSegmento,
        pubId: this.publicacionSeleccionada.id,
        conteo: this.totalConteo,
        personaNombre: this.personaSeleccionada ? this.personaSeleccionada.nombre : null
      }
    });
  }
}