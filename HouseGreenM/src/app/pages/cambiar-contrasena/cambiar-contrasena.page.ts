import { Component, inject } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-cambiar-contrasena',
  templateUrl: './cambiar-contrasena.page.html',
  styleUrls: ['./cambiar-contrasena.page.scss'],
  standalone: false
})
export class CambiarContrasenaPage {

  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);

  // Campos de contraseña
  actualContrasena: string = '';
  nuevaContrasena: string = '';
  repiteContrasena: string = '';

  // Visibilidad de contraseñas
  showActual: boolean = false;
  showNueva: boolean = false;
  showRepite: boolean = false;

  regresar() {
    this.navCtrl.back();
  }

  // Toggles de visibilidad
  toggleShowActual() {
    this.showActual = !this.showActual;
  }

  toggleShowNueva() {
    this.showNueva = !this.showNueva;
  }

  toggleShowRepite() {
    this.showRepite = !this.showRepite;
  }

  // Validaciones en tiempo real
  get hasMinLength(): boolean {
    return this.nuevaContrasena.length >= 8;
  }

  get hasUpperAndLower(): boolean {
    return /[a-z]/.test(this.nuevaContrasena) && /[A-Z]/.test(this.nuevaContrasena);
  }

  get hasNumber(): boolean {
    return /\d/.test(this.nuevaContrasena);
  }

  get passwordsMatch(): boolean {
    return this.nuevaContrasena.length > 0 && this.nuevaContrasena === this.repiteContrasena;
  }

  get isFormValid(): boolean {
    return this.actualContrasena.trim().length > 0 &&
           this.hasMinLength &&
           this.hasUpperAndLower &&
           this.hasNumber &&
           this.passwordsMatch;
  }

  async actualizarContrasena() {
    if (!this.isFormValid) return;

    // Lógica para enviar al Backend...
    const toast = await this.toastCtrl.create({
      message: 'Contraseña actualizada correctamente',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
    this.regresar();
  }

  olvidasteContrasena() {
    console.log('Recuperar contraseña actual');
  }
}