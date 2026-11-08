import { Component, computed, inject, signal } from '@angular/core';

import { ApiService, mensajeDeError } from '../../core/api.service';
import { dejarAvisoParaElLogin } from '../../core/aviso-login';
import { REGLA_CONTRASENA, problemaDeContrasena, soloDigitosYEspacio } from '../../core/contrasena';
import { ROL_ADMIN, Usuario } from '../../core/modelos';
import { Ecc, QrCode } from '../../core/qrcodegen';
import { SesionService } from '../../core/sesion.service';

// Paso A6: el Perfil de verdad, igual que la web (PerfilPage). Antes mostraba datos inventados ("Camila Rojas").
// Cada persona ve y edita sus datos, cambia su contraseña, activa o desactiva la verificación en dos pasos
// y puede eliminar su cuenta. Todo se guarda en la API: lo que se cambia aquí se ve también en la web.

const NOMBRE_ROL: Record<string, string> = {
  inversionista: 'Inversionista',
  analista: 'Analista',
  administrador: 'Administrador',
};

/** Aviso debajo de cada formulario: verde si salió bien, rojo si hubo un problema. */
type Aviso = { tipo: 'ok' | 'error'; texto: string } | null;

/** Lo que responde POST /auth/2fa/iniciar */
interface ClaveDeDosPasos {
  secret: string; // la clave, para escribirla a mano si no se puede escanear
  otpauth_url: string; // el enlace que se dibuja como código QR
}

@Component({
  selector: 'app-perfil-configuracion',
  templateUrl: './perfil-configuracion.page.html',
  styleUrls: ['./perfil-configuracion.page.scss'],
  standalone: false,
})
export class PerfilConfiguracionPage {
  private api = inject(ApiService);
  private sesion = inject(SesionService);

  readonly REGLA_CONTRASENA = REGLA_CONTRASENA;
  readonly usuario = this.sesion.usuario;
  readonly rol = computed(() => NOMBRE_ROL[this.usuario()?.role_name ?? ''] ?? 'Sin definir');
  readonly esAdmin = computed(() => this.usuario()?.role_id === ROL_ADMIN);

  // ---------- Mis datos ----------
  readonly nombre = signal('');
  readonly telefono = signal('');
  readonly guardandoDatos = signal(false);
  readonly avisoDatos = signal<Aviso>(null);
  // El botón solo se activa si se cambió algo
  readonly hayCambios = computed(() => {
    const usuario = this.usuario();
    return (
      !!usuario && (this.nombre().trim() !== usuario.full_name || this.telefono().trim() !== (usuario.phone ?? ''))
    );
  });

  // ---------- Cambiar contraseña ----------
  readonly actual = signal('');
  readonly nueva = signal('');
  readonly repetida = signal('');
  readonly mostrarClaves = signal(false);
  readonly guardandoClave = signal(false);
  readonly avisoClave = signal<Aviso>(null);

  // ---------- Verificación en dos pasos ----------
  readonly clave2fa = signal<ClaveDeDosPasos | null>(null); // con valor = se está activando
  readonly codigo2fa = signal('');
  readonly contrasena2fa = signal('');
  readonly trabajando2fa = signal(false);
  readonly aviso2fa = signal<Aviso>(null);
  // El código QR dibujado como cuadritos (igual que el QR de la web)
  readonly qr = computed(() => {
    const clave = this.clave2fa();
    if (!clave) {
      return null;
    }
    const codigo = QrCode.encodeText(clave.otpauth_url, Ecc.LOW);
    let camino = '';
    for (let y = 0; y < codigo.size; y++) {
      for (let x = 0; x < codigo.size; x++) {
        if (codigo.getModule(x, y)) {
          camino += `M${x},${y}h1v1h-1z`;
        }
      }
    }
    return { tamano: codigo.size, camino };
  });
  // La clave en grupos de 4, para que sea más fácil copiarla
  readonly claveEnGrupos = computed(() => this.clave2fa()?.secret.match(/.{1,4}/g)?.join(' ') ?? '');

  // ---------- Eliminar mi cuenta ----------
  readonly eliminarAbierto = signal(false);
  readonly contrasenaEliminar = signal('');
  readonly codigoEliminar = signal('');
  readonly eliminando = signal(false);
  readonly errorEliminar = signal('');

  async ionViewWillEnter() {
    this.ponerDatos(this.usuario());
    // Se piden los datos de nuevo: así se ve lo último, aunque se haya cambiado desde la web
    await this.sesion.actualizarUsuario();
    this.ponerDatos(this.usuario());
  }

  private ponerDatos(usuario: Usuario | null) {
    this.nombre.set(usuario?.full_name ?? '');
    this.telefono.set(usuario?.phone ?? '');
  }

  // ---------- Mis datos ----------
  escribirNombre(valor: string) {
    this.nombre.set(valor);
    this.avisoDatos.set(null);
  }

  escribirTelefono(valor: string) {
    this.telefono.set(valor);
    this.avisoDatos.set(null);
  }

  async guardarDatos() {
    this.avisoDatos.set(null);
    if (this.nombre().trim() === '') {
      this.avisoDatos.set({ tipo: 'error', texto: 'El nombre no puede quedar vacío.' });
      return;
    }
    this.guardandoDatos.set(true);
    try {
      // La API devuelve los datos ya guardados: con eso se actualiza la sesión (y el nombre del menú)
      const guardado = await this.api.patch<Usuario>('/auth/me', {
        full_name: this.nombre().trim(),
        phone: this.telefono().trim(),
      });
      this.sesion.guardarUsuario(guardado);
      this.ponerDatos(guardado);
      this.avisoDatos.set({ tipo: 'ok', texto: 'Datos guardados.' });
    } catch (error) {
      this.avisoDatos.set({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      this.guardandoDatos.set(false);
    }
  }

  // ---------- Cambiar contraseña ----------
  async cambiarContrasena() {
    this.avisoClave.set(null);
    // Se revisa lo mismo que la API, para avisar sin esperar la respuesta
    let problema: string | null = null;
    if (!this.actual() || !this.nueva() || !this.repetida()) problema = 'Completa los tres campos.';
    else if (problemaDeContrasena(this.nueva())) problema = problemaDeContrasena(this.nueva());
    else if (this.nueva() !== this.repetida()) problema = 'La contraseña nueva y su repetición no coinciden.';
    else if (this.nueva() === this.actual()) problema = 'La contraseña nueva debe ser distinta de la actual.';
    if (problema) {
      this.avisoClave.set({ tipo: 'error', texto: problema });
      return;
    }

    this.guardandoClave.set(true);
    try {
      await this.api.post('/auth/me/contrasena', { current_password: this.actual(), new_password: this.nueva() });
      this.actual.set('');
      this.nueva.set('');
      this.repetida.set('');
      this.avisoClave.set({
        tipo: 'ok',
        texto: 'Contraseña actualizada. La próxima vez que inicies sesión usa la nueva.',
      });
    } catch (error) {
      this.avisoClave.set({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      this.guardandoClave.set(false);
    }
  }

  // ---------- Verificación en dos pasos ----------
  /** El código de la aplicación: solo números y espacio ("123 456"). */
  escribirCodigo(evento: Event, destino: 'dos-pasos' | 'eliminar') {
    const campo = evento.target as HTMLInputElement;
    campo.value = soloDigitosYEspacio(campo.value);
    (destino === 'dos-pasos' ? this.codigo2fa : this.codigoEliminar).set(campo.value);
  }

  /** 1. Pide una clave nueva a la API y muestra el código QR. */
  async empezar2fa() {
    this.aviso2fa.set(null);
    this.trabajando2fa.set(true);
    try {
      this.clave2fa.set(await this.api.post<ClaveDeDosPasos>('/auth/2fa/iniciar'));
      this.codigo2fa.set('');
    } catch (error) {
      this.aviso2fa.set({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      this.trabajando2fa.set(false);
    }
  }

  /** 2. Con un código de la aplicación queda activada. */
  async confirmar2fa() {
    this.aviso2fa.set(null);
    if (this.codigo2fa().trim() === '') {
      this.aviso2fa.set({ tipo: 'error', texto: 'Escribe el código de 6 dígitos de tu aplicación.' });
      return;
    }
    this.trabajando2fa.set(true);
    try {
      this.sesion.guardarUsuario(await this.api.post<Usuario>('/auth/2fa/confirmar', { code: this.codigo2fa() }));
      this.clave2fa.set(null);
      this.codigo2fa.set('');
      this.aviso2fa.set({
        tipo: 'ok',
        texto: 'Verificación en dos pasos activada. Desde ahora te pediremos un código al iniciar sesión.',
      });
    } catch (error) {
      this.aviso2fa.set({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      this.trabajando2fa.set(false);
    }
  }

  cancelar2fa() {
    this.clave2fa.set(null);
    this.codigo2fa.set('');
    this.aviso2fa.set(null);
  }

  /** 3. Desactivar pide la contraseña y un código. */
  async desactivar2fa() {
    this.aviso2fa.set(null);
    if (this.contrasena2fa() === '' || this.codigo2fa().trim() === '') {
      this.aviso2fa.set({ tipo: 'error', texto: 'Escribe tu contraseña y el código de tu aplicación.' });
      return;
    }
    this.trabajando2fa.set(true);
    try {
      const guardado = await this.api.post<Usuario>('/auth/2fa/desactivar', {
        password: this.contrasena2fa(),
        code: this.codigo2fa(),
      });
      this.sesion.guardarUsuario(guardado);
      this.contrasena2fa.set('');
      this.codigo2fa.set('');
      this.aviso2fa.set({ tipo: 'ok', texto: 'Verificación en dos pasos desactivada.' });
    } catch (error) {
      this.aviso2fa.set({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      this.trabajando2fa.set(false);
    }
  }

  // ---------- Eliminar mi cuenta ----------
  // La cuenta no se borra: queda suspendida y sus datos se conservan. El administrador no ve esta sección.
  cancelarEliminar() {
    this.eliminarAbierto.set(false);
    this.contrasenaEliminar.set('');
    this.codigoEliminar.set('');
    this.errorEliminar.set('');
  }

  async eliminarCuenta() {
    this.errorEliminar.set('');
    const pideCodigo = this.usuario()?.two_fa_enabled ?? false;
    if (this.contrasenaEliminar() === '' || (pideCodigo && this.codigoEliminar().trim() === '')) {
      this.errorEliminar.set(
        pideCodigo ? 'Escribe tu contraseña y el código de tu aplicación.' : 'Escribe tu contraseña.',
      );
      return;
    }
    this.eliminando.set(true);
    try {
      await this.api.post('/auth/me/eliminar', {
        password: this.contrasenaEliminar(),
        code: pideCodigo ? this.codigoEliminar() : null,
      });
      // Se cierra la sesión y el inicio de sesión muestra este aviso
      dejarAvisoParaElLogin('Tu cuenta fue eliminada. Gracias por usar HouseGreen.');
      this.cancelarEliminar();
      await this.sesion.salir();
    } catch (error) {
      this.errorEliminar.set(mensajeDeError(error));
    } finally {
      this.eliminando.set(false);
    }
  }

  cerrarSesion() {
    void this.sesion.salir();
  }
}
