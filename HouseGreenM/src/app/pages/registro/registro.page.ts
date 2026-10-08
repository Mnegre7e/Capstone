import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, MenuController } from '@ionic/angular';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: false
})
export class RegistroPage implements OnInit {
  nombreyApellido: string = '';
  rut: string = '';
  usuario: string = '';
  contrasenia: string = '';
  nuevaContrasenia: string = '';
  telefono: string = '';
  correo: string = '';

  private menu = inject(MenuController);
  private alertController = inject(AlertController);
  private router = inject(Router);

  constructor() {}

  ngOnInit() {
    this.menu.enable(false);
  }

  async IrLogin() {
    const validaMayuscula = /[A-Z]/;

    if (
      !this.nombreyApellido.trim() ||
      !this.rut.trim() ||
      !this.usuario.trim() ||
      !this.contrasenia.trim() ||
      !this.telefono.trim() ||
      !this.correo.trim()
    ) {
      const alert = await this.alertController.create({
        header: 'Campos Vacíos',
        message: 'Por favor complete todos los campos',
        buttons: ['OK'],
        cssClass: 'estilo-alertas',
      });
      await alert.present();
      return;
    }

    if (!validaMayuscula.test(this.contrasenia)) {
      const alert = await this.alertController.create({
        header: 'Error en contraseña',
        message: 'La contraseña debe tener al menos una mayúscula',
        buttons: ['OK'],
        cssClass: 'estilo-alertas',
      });
      await alert.present();
      return;
    }

    if (this.contrasenia !== this.nuevaContrasenia) {
      const alert = await this.alertController.create({
        header: 'Error en contraseña',
        message: 'Las contraseñas no coinciden',
        buttons: ['OK'],
        cssClass: 'estilo-alertas',
      });
      await alert.present();
      return;
    }

    if (this.contrasenia.length < 6) {
      const alert = await this.alertController.create({
        header: 'Error en contraseña',
        message: 'La contraseña debe tener al menos 6 caracteres',
        buttons: ['OK'],
        cssClass: 'estilo-alertas',
      });
      await alert.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Registrado',
      message: 'Registrado correctamente',
      buttons: ['OK'],
      cssClass: 'estilo-alertas',
    });
    await alert.present();

    this.router.navigate(['/login']);
  }
}