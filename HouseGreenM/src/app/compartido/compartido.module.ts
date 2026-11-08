import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { EncabezadoComponent } from './encabezado.component';
import { EtiquetaRiesgoComponent } from './etiqueta-riesgo.component';
import { SinFotoComponent } from './sin-foto.component';
import { TarjetaRemateComponent } from './tarjeta-remate.component';

// Paso A2: piezas que usan varias pantallas (se importa en el módulo de cada pantalla)
@NgModule({
  declarations: [EncabezadoComponent, EtiquetaRiesgoComponent, SinFotoComponent, TarjetaRemateComponent],
  imports: [CommonModule, IonicModule, RouterModule],
  exports: [EncabezadoComponent, EtiquetaRiesgoComponent, SinFotoComponent, TarjetaRemateComponent],
})
export class CompartidoModule {}
