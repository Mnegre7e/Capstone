import { Component, OnInit, inject } from '@angular/core';
import { MenuController, NavController } from '@ionic/angular/lazy';

import { mensajeDeError } from '../../core/api.service';
import { SesionService } from '../../core/sesion.service';

// Paso A1: inicio de sesión real contra la API, con la verificación en dos pasos
// (obligatoria para el administrador y opcional para el resto).
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  private sesion = inject(SesionService);
  private menu = inject(MenuController);
  private navegacion = inject(NavController);

  correo = '';
  contrasenia = '';
  codigo = '';
  pideCodigo = false; // true = la contraseña estuvo bien y falta el código de 6 dígitos
  enviando = false;
  error = '';

  ngOnInit() {
    void this.menu.enable(false);
  }

  async entrar() {
    this.error = '';
    if (!this.correo.trim() || !this.contrasenia) {
      this.error = 'Escribe tu correo y tu contraseña.';
      return;
    }
    if (this.pideCodigo && this.codigo.replace(/\s/g, '').length !== 6) {
      this.error = 'Escribe el código de 6 dígitos de tu aplicación.';
      return;
    }

    this.enviando = true;
    try {
      const resultado = await this.sesion.iniciarSesion(
        this.correo.trim(),
        this.contrasenia,
        this.pideCodigo ? this.codigo.replace(/\s/g, '') : undefined,
      );
      if (resultado === 'pide_codigo') {
        this.pideCodigo = true;
        return;
      }
      this.contrasenia = '';
      this.codigo = '';
      this.pideCodigo = false;
      await this.navegacion.navigateRoot(this.sesion.rutaDeInicio());
    } catch (error) {
      this.error = mensajeDeError(error);
    } finally {
      this.enviando = false;
    }
  }

  /** Volver a escribir el correo y la contraseña (por ejemplo, para entrar con otra cuenta). */
  volver() {
    this.pideCodigo = false;
    this.codigo = '';
    this.error = '';
  }
}
