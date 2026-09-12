import { Component, OnInit, inject } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { Browser } from '@capacitor/browser';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  private menu = inject(MenuController);
  private storage = inject(NativeStorage);

  usuario: string = '';

  constructor() {}

  ngOnInit() {
    this.menu.enable(true);
  }

  ionViewWillEnter() {
    this.menu.enable(true);
    this.obtenerUsuario();
  }

  obtenerUsuario() {
    this.storage.getItem('usuario')
      .then(data => {
        this.usuario = typeof data === 'object' ? (data.nombreusuario || 'Inversionista') : data;
      })
      .catch(error => {
        console.log('Sesión no encontrada en NativeStorage (Modo web):', error);
        const usuarioLocal = localStorage.getItem('usuario');
        this.usuario = usuarioLocal ? usuarioLocal : 'Inversionista';
      });
  }

  async AbrirMaps() {
    try {
      await Browser.open({ 
        url: 'https://www.google.com/maps/place/Centro+de+Justicia+de+Santiago/@-33.4611293,-70.6622342,17z/' 
      });
    } catch (e) {
      window.open('https://www.google.com/maps/place/Centro+de+Justicia+de+Santiago/@-33.4611293,-70.6622342,17z/', '_blank');
    }
  }
}