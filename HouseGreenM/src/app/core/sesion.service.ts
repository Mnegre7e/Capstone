import { Injectable, computed, inject, signal } from '@angular/core';
import { MenuController, NavController } from '@ionic/angular/lazy';

import { ApiService, ErrorDeApi } from './api.service';
import { ROL_ADMIN, ROL_ANALISTA, Token, Usuario } from './modelos';

// Paso A1: la sesión de la persona. El token se guarda en el teléfono (localStorage),
// así no hay que iniciar sesión cada vez que se abre la app.
const CLAVE_DEL_TOKEN = 'housegreen-token';

@Injectable({ providedIn: 'root' })
export class SesionService {
  private api = inject(ApiService);
  private menu = inject(MenuController);
  private navegacion = inject(NavController);
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
      // Paso A4: al abrir se espera un tiempo máximo; si la API no contesta, se muestra el login
      // (antes la app quedaba en blanco esperando).
      // Paso A22: 75 segundos (antes 10), lo que tarda en despertar la API publicada en Render. Mientras,
      // se ve la pantalla "Conectando con HouseGreen…" (src/index.html).
      this.usuario.set(await this.api.get<Usuario>('/auth/me', 75));
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

  /** Paso A4: vuelve a preguntar quién es (por ejemplo, después de pagar el plan Premium). */
  async actualizarUsuario(): Promise<void> {
    if (!this.token()) {
      return;
    }
    try {
      this.usuario.set(await this.api.get<Usuario>('/auth/me'));
    } catch {
      // si falla, se queda con los datos que tenía
    }
  }

  /** Paso A6: guarda los datos que devolvió la API (por ejemplo, al editar el Perfil). */
  guardarUsuario(usuario: Usuario): void {
    this.usuario.set(usuario);
  }

  cerrarSesion(): void {
    this.borrar();
  }

  /** Paso A1c: lo que hace cualquier botón "Cerrar sesión": borra la sesión y vuelve al login. */
  async salir(): Promise<void> {
    this.borrar();
    void this.menu.close();
    await this.navegacion.navigateRoot('/login');
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
    return '/catalogo-propiedades'; // Paso A2: como en la web, el inversionista parte en Remates
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
