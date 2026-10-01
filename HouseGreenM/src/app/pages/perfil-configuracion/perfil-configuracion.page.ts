
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-perfil-configuracion',
  templateUrl: './perfil-configuracion.page.html',
  styleUrls: ['./perfil-configuracion.page.scss'],
  standalone: false
})
export class PerfilConfiguracionPage {

  private router = inject(Router);
  private navCtrl = inject(NavController);

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
    console.log('Cambiar contraseña');
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
    console.log('Ir a Sobre HouseGreen');
  }
  cerrarSesion() {
    this.router.navigate(['/login']);
  }
}