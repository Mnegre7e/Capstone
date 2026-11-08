
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular/lazy';

import { SesionService } from '../../core/sesion.service';

@Component({
  selector: 'app-perfil-configuracion',
  templateUrl: './perfil-configuracion.page.html',
  styleUrls: ['./perfil-configuracion.page.scss'],
  standalone: false
})
export class PerfilConfiguracionPage {

  private router = inject(Router);
  private navCtrl = inject(NavController);
  private sesion = inject(SesionService);

  usuario = {
    nombre: 'Camila Rojas',
    iniciales: 'CR',
    email: 'camila.rojas@ejemplo.cl',
    rut: '18.456.732-K',
    telefono: '+56 9 8765 4321',
    ultimaContrasena: '12 sep 2026',
    comunasSiguiendo: 'Santiago, Providencia'
  };

  // Volver a la pantalla anterior
  regresar() {
    this.navCtrl.back();
  }

  editarPerfil() {
    console.log('Editar perfil');
  }

  cambiarContrasena() {
    this.router.navigate(['/cambiar-contrasena']);
  }

  // Redirige a la vista de alertas
  irAAlertas() {
    this.router.navigate(['/alertas']);
  }

  irAComunas() {
    console.log('Ir a comunas que sigo');
  }

  irASugerencias() {
    this.router.navigate(['/contacto']);
  }

  irASobreNosotros() {
    this.router.navigate(['/nosotros']);
  }
  // Paso A1c: borra la sesión (antes solo cambiaba de pantalla y la sesión seguía abierta)
  cerrarSesion() {
    return this.sesion.salir();
  }
}