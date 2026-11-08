import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';

import { AvisoPremiumComponent } from './aviso-premium.component';
import { BuscadorReportesComponent } from './buscador-reportes.component';
import { CampoEntradaComponent } from './campo-entrada.component';
import { DatosRemateComponent } from './datos-remate.component';
import { EncabezadoComponent } from './encabezado.component';
import { EtiquetaRiesgoComponent } from './etiqueta-riesgo.component';
import { GaleriaFotosComponent } from './galeria-fotos.component';
import { MarcoAdminComponent } from './marco-admin.component';
import { MarcoEntradaComponent } from './marco-entrada.component';
import { MarcoReportesComponent } from './marco-reportes.component';
import { PrecioComunaComponent } from './precio-comuna.component';
import { BarrasReporteComponent } from './rep-barras.component';
import { CifrasReporteComponent } from './rep-cifras.component';
import { GraficoReporteComponent } from './rep-grafico.component';
import { MedidasReporteComponent } from './rep-medidas.component';
import { SemaforoReporteComponent } from './rep-semaforo.component';
import { TarjetaReporteComponent } from './rep-tarjeta.component';
import { SinFotoComponent } from './sin-foto.component';
import { TarjetaRemateComponent } from './tarjeta-remate.component';
import { TarjetaSemaforoComponent } from './tarjeta-semaforo.component';

// Pasos A2, A3, A5, A9 y A10: piezas que usan varias pantallas (se importa en el módulo de cada pantalla)
const PIEZAS = [
  AvisoPremiumComponent,
  BarrasReporteComponent,
  BuscadorReportesComponent,
  CampoEntradaComponent,
  CifrasReporteComponent,
  DatosRemateComponent,
  EncabezadoComponent,
  EtiquetaRiesgoComponent,
  GaleriaFotosComponent,
  GraficoReporteComponent,
  MarcoAdminComponent,
  MarcoEntradaComponent,
  MarcoReportesComponent,
  MedidasReporteComponent,
  PrecioComunaComponent,
  SemaforoReporteComponent,
  SinFotoComponent,
  TarjetaRemateComponent,
  TarjetaReporteComponent,
  TarjetaSemaforoComponent,
];

@NgModule({
  declarations: PIEZAS,
  imports: [CommonModule, IonicModule, RouterModule],
  exports: PIEZAS,
})
export class CompartidoModule {}
