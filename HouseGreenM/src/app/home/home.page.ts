import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { Browser } from '@capacitor/browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePage implements OnInit {

  private menu = inject(MenuController);
  private storage = inject(NativeStorage);

  usuario: string = '';

  ngOnInit() {
    this.menu.enable(true);
  }

  ionViewWillEnter() {
    this.menu.enable(true);

    this.storage.getItem('usuario')
      .then(data => {
        this.usuario = typeof data === 'object' ? (data.nombreusuario || 'Inversionista') : data;
      })
      .catch(error => {
        console.log('Sesión no encontrada en NativeStorage:', error);
        this.usuario = 'Inversionista';
      });
  }

  async AbrirMaps() {
    await Browser.open({ 
      url: 'https://www.google.com/maps/place/Centro+de+Justicia+de+Santiago/@-33.4611293,-70.6622342,17z/' 
    });
  }
}