import { Component } from '@angular/core';

@Component({
  selector: 'app-analisis-semaforo',
  templateUrl: './analisis-semaforo.page.html',
  styleUrls: ['./analisis-semaforo.page.scss'],
  standalone: false
})
export class AnalisisSemaforoPage {

  montoRemate: number = 45000000;
  valorMercado: number = 75000000;
  deudasPendientes: number = 3000000;

  get margenInversion(): number {
    return this.valorMercado - (this.montoRemate + this.deudasPendientes);
  }

  get nivelRiesgo(): 'bajo' | 'medio' | 'alto' {
    const retorno = (this.margenInversion / this.valorMercado) * 100;
    if (retorno >= 35) return 'bajo';
    if (retorno >= 15) return 'medio';
    return 'alto';
  }

  // Convierte número a formato moneda CLP ($45.000.000)
  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined || isNaN(valor)) return '$0';
    return '$' + valor.toLocaleString('es-CL');
  }

  // Procesa la entrada del usuario eliminando caracteres no numéricos
  actualizarMonto(campo: 'montoRemate' | 'valorMercado' | 'deudasPendientes', event: any) {
    const valorLimpio = event.detail.value.replace(/\D/g, '');
    this[campo] = valorLimpio ? parseInt(valorLimpio, 10) : 0;
  }
}