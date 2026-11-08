import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { AvisoPremiumComponent } from './aviso-premium.component';
import { CampoEntradaComponent } from './campo-entrada.component';
import { DatosRemateComponent } from './datos-remate.component';
import { EncabezadoComponent } from './encabezado.component';
import { EtiquetaRiesgoComponent } from './etiqueta-riesgo.component';
import { GaleriaFotosComponent } from './galeria-fotos.component';
import { MarcoAdminComponent } from './marco-admin.component';
import { MarcoEntradaComponent } from './marco-entrada.component';
import { PrecioComunaComponent } from './precio-comuna.component';
import { SinFotoComponent } from './sin-foto.component';
import { TarjetaRemateComponent } from './tarjeta-remate.component';
import { TarjetaSemaforoComponent } from './tarjeta-semaforo.component';

// Pasos A2, A3, A5 y A9: piezas que usan varias pantallas (se importa en el módulo de cada pantalla)
const PIEZAS = [
  AvisoPremiumComponent,
  CampoEntradaComponent,
  DatosRemateComponent,
  EncabezadoComponent,
  EtiquetaRiesgoComponent,
  GaleriaFotosComponent,
  MarcoAdminComponent,
  MarcoEntradaComponent,
  PrecioComunaComponent,
  SinFotoComponent,
  TarjetaRemateComponent,
  TarjetaSemaforoComponent,
];

@NgModule({
  declarations: PIEZAS,
  imports: [CommonModule, IonicModule, RouterModule],
  exports: PIEZAS,
})
export class CompartidoModule {}
