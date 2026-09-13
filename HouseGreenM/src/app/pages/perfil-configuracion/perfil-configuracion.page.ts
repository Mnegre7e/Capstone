import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface UsuarioPerfil {
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  tipoUsuario: string;
}

@Component({
  selector: 'app-perfil-configuracion',
  templateUrl: './perfil-configuracion.page.html',
  styleUrls: ['./perfil-configuracion.page.scss'],
  standalone: false
})
export class PerfilConfiguracionPage {

  private router = inject(Router);

  usuario: UsuarioPerfil = {
    nombre: 'Juan Pérez',
    rut: '12.345.678-9',
    email: 'juan.perez@email.com',
    telefono: '+56 9 8765 4321',
    tipoUsuario: 'Inversionista'
  };

  irAFavoritos() {
    this.router.navigate(['/catalogo-propiedades']);
  }

  cerrarSesion() {
    this.router.navigate(['/login']);
  }
}