import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { NgModule, inject, provideAppInitializer } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular/lazy';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { ApiService } from './core/api.service';
import { SesionService } from './core/sesion.service';
import { tokenInterceptor } from './core/token.interceptor';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // Paso A1: conexión con la API (con el token de la sesión) y, antes de mostrar la primera
    // pantalla, revisar si hay una sesión guardada.
    // Paso A22: primero se despierta la API publicada (sin esperarla), por si no hay sesión guardada
    provideHttpClient(withInterceptors([tokenInterceptor])),
    provideAppInitializer(() => {
      inject(ApiService).despertar();
      return inject(SesionService).iniciar();
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
