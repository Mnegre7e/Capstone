import { Component } from '@angular/core';

@Component({
  selector: 'app-contacto',
  templateUrl: './contacto.page.html',
  styleUrls: ['./contacto.page.scss'],
  standalone: false
})
export class ContactoPage {

  mensaje = {
    nombre: '',
    email: '',
    asunto: '',
    contenido: ''
  };

  constructor() {}

  enviarFormulario() {
    console.log('Mensaje enviado:', this.mensaje);
    // Lógica para enviar el mensaje al backend o servicio
    this.mensaje = { nombre: '', email: '', asunto: '', contenido: '' };
  }
}