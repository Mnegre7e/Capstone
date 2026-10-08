import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-contacto',
  templateUrl: './contacto.page.html',
  styleUrls: ['./contacto.page.scss'],
  standalone: false
})
export class ContactoPage {

  private location = inject(Location);

  calificacion: number = 4;
  estrellas: number[] = [1, 2, 3, 4, 5];

  textosCalificacion: { [key: number]: string } = {
    1: 'Muy mala',
    2: 'Mala',
    3: 'Regular',
    4: 'Muy buena',
    5: 'Excelente'
  };

  categorias: string[] = [
    'Datos de propiedades',
    'Semáforo',
    'Mapa',
    'Notificaciones',
    'Otro'
  ];

  categoriaSeleccionada: string = 'Semáforo';
  sugerenciaText: string = 'Me gustaría ver el historial de cambios del semáforo de cada propiedad.';
  autorizaRespuesta: boolean = true;
  maxCaracteres: number = 500;

  goBack() {
    this.location.back();
  }

  setCalificacion(valor: number) {
    this.calificacion = valor;
  }

  seleccionarCategoria(cat: string) {
    this.categoriaSeleccionada = cat;
  }

  toggleAutorizacion() {
    this.autorizaRespuesta = !this.autorizaRespuesta;
  }

  enviarSugerencia() {
    if (!this.sugerenciaText.trim()) return;

    const payload = {
      calificacion: this.calificacion,
      categoria: this.categoriaSeleccionada,
      sugerencia: this.sugerenciaText,
      autorizaRespuesta: this.autorizaRespuesta
    };

    console.log('Enviando sugerencia:', payload);
    // Lógica para enviar a backend o mostrar toast de confirmación
  }
}