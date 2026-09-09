import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, MenuController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  usuario: string = "";
  correo: string = "";
  contrasenia: string = "";

  private router = inject(Router);
  private menu = inject(MenuController);
  private alertController = inject(AlertController);

  constructor() {}

  ngOnInit() {
    this.menu.enable(false);
  }

  async irPagina() {
    const identificador = (this.usuario || this.correo).trim();
    
    if (identificador === "" || this.contrasenia.trim() === "") {
      const alert = await this.alertController.create({
        header: 'Campos Vacíos',
        message: 'Por favor ingrese su usuario o correo y contraseña.',
        buttons: ['OK'],
        cssClass: 'estilo-alertas'
      });
      await alert.present();
      return;
    }

    this.router.navigate(['/home']);
  }

  // Alias para garantizar compatibilidad si la plantilla llama a iniciarSesion()
  async iniciarSesion() {
    await this.irPagina();
  }
}