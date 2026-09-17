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
}