import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, MenuController } from '@ionic/angular';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {

  usuario: string = "";
  contrasenia: string = "";

  private router = inject(Router);
  private menu = inject(MenuController);
  private alertController = inject(AlertController);
  private storage = inject(NativeStorage);

  constructor() {}

  ngOnInit() {
    this.menu.enable(false);
  }

  async irPagina() {
    if (this.usuario.trim() === "" || this.contrasenia.trim() === "") {
      const alert = await this.alertController.create({
        header: 'Campos Vacíos',
        message: 'Por favor ingrese su usuario y contraseña.',
        buttons: ['OK'],
        cssClass: 'estilo-alertas'
      });
      await alert.present();
      return;
    }

    try {
      // Almacena la sesión en NativeStorage
      await this.storage.setItem('usuario', this.usuario);

      if (this.usuario.toLowerCase() === 'admin') {
        this.router.navigate(['/homeadmin']);
      } else {
        this.router.navigate(['/home']);
      }
    } catch (error) {
      // Fallback para pruebas en navegador web donde NativeStorage no está disponible
      console.warn('NativeStorage solo funciona en dispositivos móviles. Redirigiendo...', error);
      
      if (this.usuario.toLowerCase() === 'admin') {
        this.router.navigate(['/homeadmin']);
      } else {
        this.router.navigate(['/home']);
      }
    }
  }
}