import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, MenuController } from '@ionic/angular';

@Component({
  selector: 'app-recuperar-clave',
  templateUrl: './recuperar-clave.page.html',
  styleUrls: ['./recuperar-clave.page.scss'],
  standalone: false
})
export class RecuperarClavePage implements OnInit {
  correo: string = "";

  private menu = inject(MenuController);
  private alertController = inject(AlertController);
  private router = inject(Router);

  constructor() {}

  ngOnInit() {
    this.menu.enable(false);
  }

  async enviarCorreo(): Promise<boolean> {
    if (!this.correo.trim() || !this.correo.includes('@')) {
      await this.mostrarAlerta('Error', 'Debe ingresar un correo válido');
      return false;
    }

    await this.mostrarAlerta(
      'Restablecer Contraseña',
      'Se ha enviado un correo con las instrucciones para restablecer tu contraseña.'
    );

    this.router.navigate(['/login']);
    return true;
  }

  private async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'estilo-alertas'
    });
    await alert.present();
  }
}