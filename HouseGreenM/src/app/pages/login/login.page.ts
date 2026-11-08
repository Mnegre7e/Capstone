import { Component, inject, signal } from '@angular/core';
import { NavController } from '@ionic/angular/lazy';

import { mensajeDeError } from '../../core/api.service';
import { tomarAvisoDelLogin } from '../../core/aviso-login';
import { soloDigitosYEspacio } from '../../core/contrasena';
import { SesionService } from '../../core/sesion.service';

// Paso A1: inicio de sesión real contra la API, con la verificación en dos pasos
// (obligatoria para el administrador y opcional para el resto).
// Paso A5: con el mismo diseño y los mismos textos que la web (LoginPage).
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  private sesion = inject(SesionService);
  private navegacion = inject(NavController);

  readonly correo = signal('');
  readonly contrasenia = signal('');
  readonly mostrar = signal(false); // el ojo: ver la contraseña mientras se escribe
  readonly codigo = signal('');
  readonly pideCodigo = signal(false); // true = la contraseña estuvo bien y falta el código de 6 dígitos
  readonly enviando = signal(false);
  readonly error = signal('');
  readonly aviso = signal(''); // lo deja otra pantalla (por ejemplo, al cambiar la contraseña)

  ionViewWillEnter() {
    this.aviso.set(tomarAvisoDelLogin());
  }

  async entrar() {
    this.error.set('');
    const correo = this.correo().trim();
    if (!correo || !this.contrasenia()) {
      this.error.set('Debes ingresar tu correo y contraseña.');
      return;
    }
    const codigo = this.codigo().replace(/\s/g, '');
    if (this.pideCodigo() && codigo.length !== 6) {
      this.error.set('Escribe el código de 6 dígitos de tu aplicación.');
      return;
    }

    this.enviando.set(true);
    try {
      const resultado = await this.sesion.iniciarSesion(correo, this.contrasenia(), this.pideCodigo() ? codigo : undefined);
      if (resultado === 'pide_codigo') {
        // La contraseña está bien, pero la cuenta pide el código: se muestra el segundo paso
        this.pideCodigo.set(true);
        this.codigo.set('');
        return;
      }
      this.contrasenia.set('');
      this.codigo.set('');
      this.pideCodigo.set(false);
      this.aviso.set('');
      await this.navegacion.navigateRoot(this.sesion.rutaDeInicio());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.enviando.set(false);
    }
  }

  /** El código se escribe solo con números (y un espacio, como lo muestra la aplicación: "123 456"). */
  escribirCodigo(evento: Event) {
    const campo = evento.target as HTMLInputElement;
    campo.value = soloDigitosYEspacio(campo.value);
    this.codigo.set(campo.value);
  }

  /** Volver a escribir el correo y la contraseña (por ejemplo, para entrar con otra cuenta). */
  volver() {
    this.pideCodigo.set(false);
    this.codigo.set('');
    this.error.set('');
  }
}
