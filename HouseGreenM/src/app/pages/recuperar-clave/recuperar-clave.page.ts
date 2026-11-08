import { Component, inject, signal } from '@angular/core';
import { NavController } from '@ionic/angular/lazy';

import { ApiService, mensajeDeError } from '../../core/api.service';
import { dejarAvisoParaElLogin } from '../../core/aviso-login';
import { REGLA_CONTRASENA, problemaDeContrasena, soloDigitosYEspacio } from '../../core/contrasena';

// Paso A5: recuperar la contraseña en dos pasos, igual que la web (RecuperarPage):
// 1) La persona escribe su correo y le llega un código de 6 dígitos (vale 15 minutos).
// 2) Escribe el código y su contraseña nueva. Después vuelve al inicio de sesión con un aviso.
@Component({
  selector: 'app-recuperar-clave',
  templateUrl: './recuperar-clave.page.html',
  styleUrls: ['./recuperar-clave.page.scss'],
  standalone: false,
})
export class RecuperarClavePage {
  private api = inject(ApiService);
  private navegacion = inject(NavController);

  readonly REGLA_CONTRASENA = REGLA_CONTRASENA;

  readonly paso = signal<'correo' | 'codigo'>('correo');
  readonly correo = signal('');
  readonly codigo = signal('');
  readonly clave = signal('');
  readonly repetida = signal('');
  readonly mostrar = signal(false); // los ojos muestran u ocultan las dos contraseñas a la vez
  readonly error = signal('');
  readonly aviso = signal('');
  readonly enviando = signal(false);

  /** Pide el código. Se usa al empezar y con "No me llegó: enviar otro código". */
  async pedirCodigo(otraVez: boolean) {
    this.error.set('');
    this.aviso.set('');
    if (!this.correo().trim().includes('@')) {
      this.error.set('Escribe el correo con el que te registraste.');
      return;
    }
    this.enviando.set(true);
    try {
      await this.api.post('/auth/recuperar/pedir', { email: this.correo().trim() });
      this.paso.set('codigo');
      this.codigo.set('');
      if (otraVez) {
        this.aviso.set('Te enviamos otro código. Usa siempre el del último correo que te llegó.');
      }
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.enviando.set(false);
    }
  }

  async cambiarContrasena() {
    this.error.set('');
    this.aviso.set('');
    const soloNumeros = this.codigo().replace(/\s/g, '');
    if (!/^\d{6}$/.test(soloNumeros)) {
      this.error.set('El código tiene 6 dígitos.');
      return;
    }
    const problema = problemaDeContrasena(this.clave());
    if (problema) {
      this.error.set(problema);
      return;
    }
    if (this.clave() !== this.repetida()) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.enviando.set(true);
    try {
      await this.api.post('/auth/recuperar/cambiar', {
        email: this.correo().trim(),
        code: soloNumeros,
        new_password: this.clave(),
      });
      dejarAvisoParaElLogin('Tu contraseña se cambió. Ya puedes iniciar sesión con la nueva.');
      this.clave.set('');
      this.repetida.set('');
      await this.navegacion.navigateRoot('/login');
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.enviando.set(false);
    }
  }

  /** El código se escribe solo con números (y un espacio, como lo muestra el correo: "123 456"). */
  escribirCodigo(evento: Event) {
    const campo = evento.target as HTMLInputElement;
    campo.value = soloDigitosYEspacio(campo.value);
    this.codigo.set(campo.value);
  }

  usarOtroCorreo() {
    this.paso.set('correo');
    this.codigo.set('');
    this.error.set('');
    this.aviso.set('');
  }
}
