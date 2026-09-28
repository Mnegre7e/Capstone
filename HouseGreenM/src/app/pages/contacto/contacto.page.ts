import { Component, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-contacto',
  templateUrl: './contacto.page.html',
  styleUrls: ['./contacto.page.scss'],
  standalone: false
})
export class ContactoPage {

  private toastController = inject(ToastController);

  tipoSugerencia: string = '';
  asunto: string = '';
  mensaje: string = '';
  requiereRespuesta: boolean = false;

  async enviarSugerencia() {
    if (!this.tipoSugerencia || !this.asunto || !this.mensaje) {
      return;
    }

    const toast = await this.toastController.create({
      message: '¡Muchas gracias! Tu sugerencia ha sido enviada con éxito.',
      duration: 3000,
      color: 'success',
      position: 'bottom',
      icon: 'checkmark-circle-outline'
    });
    await toast.present();

    this.tipoSugerencia = '';
    this.asunto = '';
    this.mensaje = '';
    this.requiereRespuesta = false;
  }
}