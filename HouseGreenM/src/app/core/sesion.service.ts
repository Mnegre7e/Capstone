import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiService, ErrorDeApi } from './api.service';
import { ROL_ADMIN, ROL_ANALISTA, Token, Usuario } from './modelos';

// Paso A1: la sesión de la persona. El token se guarda en el teléfono (localStorage),
// así no hay que iniciar sesión cada vez que se abre la app.
const CLAVE_DEL_TOKEN = 'housegreen-token';

@Injectable({ providedIn: 'root' })
export class SesionService {
  private api = inject(ApiService);
  private token = signal<string | null>(leerToken());

  /** La persona que inició sesión (null = nadie). */
  readonly usuario = signal<Usuario | null>(null);
  readonly conSesion = computed(() => this.usuario() !== null);

  obtenerToken(): string | null {
    return this.token();
  }

  /** Al abrir la app: si hay un token guardado, pregunta a la API de quién es. */
  async iniciar(): Promise<void> {
    if (!this.token()) {
      return;
    }
    try {
      this.usuario.set(await this.api.get<Usuario>('/auth/me'));
    } catch (error) {
      // Solo se borra si la API dice que el token ya no sirve; si la API no respondió, se conserva
      if (error instanceof ErrorDeApi && (error.status === 401 || error.status === 403)) {
        this.borrar();
      }
    }
  }

  /** 'listo' = entró; 'pide_codigo' = la cuenta tiene verificación en dos pasos y falta el código. */
  async iniciarSesion(email: string, password: string, codigo?: string): Promise<'listo' | 'pide_codigo'> {
    const respuesta = await this.api.post<Token>('/auth/login', { email, password, code: codigo || null });
    if (respuesta.requires_2fa || !respuesta.access_token) {
      return 'pide_codigo';
    }
    this.guardarToken(respuesta.access_token);
    try {
      this.usuario.set(await this.api.get<Usuario>('/auth/me'));
    } catch (error) {
      this.borrar();
      throw error;
    }
    return 'listo';
  }

  cerrarSesion(): void {
    this.borrar();
  }

  /** La pantalla con que parte cada rol. */
  rutaDeInicio(): string {
    const rol = this.usuario()?.role_id;
    if (rol === ROL_ADMIN) {
      return '/admin-home';
    }
    if (rol === ROL_ANALISTA) {
      return '/analista/resumen';
    }
    return '/home';
  }

  private guardarToken(token: string): void {
    this.token.set(token);
    try {
      localStorage.setItem(CLAVE_DEL_TOKEN, token);
    } catch {
      // Sin almacenamiento la sesión dura hasta cerrar la app
    }
  }

  private borrar(): void {
    this.token.set(null);
    this.usuario.set(null);
    try {
      localStorage.removeItem(CLAVE_DEL_TOKEN);
    } catch {
      // nada que borrar
    }
  }
}

function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_DEL_TOKEN);
  } catch {
    return null;
  }
}
