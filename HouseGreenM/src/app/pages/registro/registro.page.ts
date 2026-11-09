import { Component, inject, signal } from '@angular/core';
import { NavController } from '@ionic/angular/lazy';

import { ApiService, mensajeDeError } from '../../core/api.service';
import { REGLA_CONTRASENA, problemaDeContrasena } from '../../core/contrasena';
import { SesionService } from '../../core/sesion.service';
import { formatearTelefono } from '../../core/telefono';

// Paso A5: crear cuenta de verdad (antes esta pantalla decía "Registrado" sin crear nada), igual que la web
// (RegisterPage): POST /auth/registro y, apenas se crea, entra sola para no volver a escribir los datos.
// La API anota el registro como hecho desde la app (encabezado X-Plataforma: app).
@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: false,
})
export class RegistroPage {
  private api = inject(ApiService);
  private sesion = inject(SesionService);
  private navegacion = inject(NavController);

  readonly REGLA_CONTRASENA = REGLA_CONTRASENA;

  readonly nombre = signal('');
  readonly correo = signal('');
  readonly telefono = signal('');
  readonly formatearTelefono = formatearTelefono; // paso A19: "+56 9 1234 5678", sin dígitos de más
  readonly contrasenia = signal('');
  readonly repetida = signal('');
  readonly mostrar = signal(false); // los dos ojos muestran u ocultan las dos contraseñas a la vez
  readonly guardando = signal(false);
  readonly error = signal('');

  async crearCuenta() {
    this.error.set('');
    const nombre = this.nombre().trim();
    const correo = this.correo().trim();
    if (!nombre || !correo || !this.contrasenia()) {
      this.error.set('Nombre, correo y contraseña son obligatorios.');
      return;
    }
    // Las mismas reglas de contraseña que la web y la API
    const problema = problemaDeContrasena(this.contrasenia());
    if (problema) {
      this.error.set(problema);
      return;
    }
    if (this.contrasenia() !== this.repetida()) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.guardando.set(true);
    try {
      // 1. Crea la cuenta en la API
      await this.api.post('/auth/registro', {
        full_name: nombre,
        email: correo,
        phone: this.telefono().trim() || null,
        password: this.contrasenia(),
      });
      // 2. Entra de inmediato con la cuenta nueva
      await this.sesion.iniciarSesion(correo, this.contrasenia());
      this.contrasenia.set('');
      this.repetida.set('');
      await this.navegacion.navigateRoot(this.sesion.rutaDeInicio());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }
}
