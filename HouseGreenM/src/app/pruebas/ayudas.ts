import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MenuController, NavController } from '@ionic/angular/lazy';
import { vi } from 'vitest';

import { environment } from '../../environments/environment';
import { ErrorDeApi } from '../core/api.service';
import { Usuario } from '../core/modelos';
import { PuntoDeLaSerie } from '../core/reportes';
import { tokenInterceptor } from '../core/token.interceptor';

// Paso A11: lo que comparten las 40 pruebas de la app (funcionales.spec.ts y no-funcionales.spec.ts).
// Las pruebas no usan la API real: HttpTestingController hace de API y responde lo que cada prueba necesita,
// así se pueden probar también los errores (sin conexión, sesión vencida, la API no contesta...).

/** La dirección de la API (las pruebas revisan que cada pedido vaya ahí). */
export const API = environment.apiUrl;

/** Donde la app guarda el token de la sesión en el teléfono. */
export const CLAVE_DEL_TOKEN = 'housegreen-token';

/** Un NavController de mentira: anota a qué pantalla se quiso ir. */
export function crearNavegacion() {
  return {
    navigateRoot: vi.fn(() => Promise.resolve(true)),
    navigateForward: vi.fn(() => Promise.resolve(true)),
    navigateBack: vi.fn(() => Promise.resolve(true)),
    back: vi.fn(),
  };
}

/** Un MenuController de mentira (el menú lateral). */
export function crearMenu() {
  return { close: vi.fn(() => Promise.resolve(true)) };
}

/**
 * Lo que necesita cada prueba: Angular sin zone.js (como la app), el router, la conexión HTTP con el
 * mismo interceptor de la app (token y X-Plataforma) pero con una API de prueba, y la navegación de Ionic.
 */
export function proveedores(
  navegacion = crearNavegacion(),
  menu = crearMenu(),
): (Provider | EnvironmentProviders)[] {
  return [
    provideZonelessChangeDetection(),
    // Paso A11b: cualquier dirección es válida en las pruebas. Cuando la sesión vence (401) la app va a /login;
    // sin esta ruta el router de prueba no la encontraba y avisaba un error suelto (NG04002) al final de las pruebas.
    provideRouter([{ path: '**', children: [] }]),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    provideHttpClientTesting(),
    { provide: NavController, useValue: navegacion },
    { provide: MenuController, useValue: menu },
  ];
}

/** Una persona de prueba con el tipo de cuenta pedido (1 inversionista, 2 analista, 3 administrador). */
export function usuario(rol: number, cambios: Partial<Usuario> = {}): Usuario {
  return {
    id: `persona-${rol}`,
    email: `persona${rol}@correo.cl`,
    full_name: 'Persona de Prueba',
    role_id: rol,
    role_name: null,
    phone: null,
    two_fa_enabled: false,
    two_fa_required: rol === 3,
    premium_until: null,
    acceso_completo: rol !== 1,
    ...cambios,
  };
}

/** Espera a que terminen las promesas pendientes (y, si se pide, unos milisegundos más). */
export function esperar(milisegundos = 0): Promise<void> {
  return new Promise((listo) => setTimeout(listo, milisegundos));
}

/** El error con que terminó una promesa (o null si terminó bien). */
export async function errorDe(promesa: Promise<unknown>): Promise<ErrorDeApi | null> {
  try {
    await promesa;
    return null;
  } catch (error) {
    if (error instanceof ErrorDeApi) {
      return error;
    }
    throw error;
  }
}

/** Un punto del gráfico de los reportes (lo que no se indica queda en 0). */
export function punto(fecha: string, cambios: Partial<PuntoDeLaSerie> = {}): PuntoDeLaSerie {
  return { fecha, registros: 0, publicaciones: 0, vistas: 0, guardados: 0, suscripciones: 0, ...cambios };
}

/** Un reporte mínimo como el que devuelve GET /reportes (solo lo que revisan las pruebas). */
export function reporte(periodo: string): Record<string, unknown> {
  return {
    periodo,
    desde: '2026-11-01T00:00:00-03:00',
    hasta: '2026-11-08T23:59:59-03:00',
    agrupado_por: 'dia',
    filtros: { comuna_id: null, comuna: null, tipo: null, semaforo: null },
  };
}

/** Borra lo que una prueba haya guardado en el teléfono, para que cada prueba parta de cero. */
export function limpiarTelefono(): void {
  localStorage.clear();
  sessionStorage.clear();
}

/** Todo lo que la app guardó en el teléfono (localStorage y sessionStorage), como texto. */
export function loGuardadoEnElTelefono(): string {
  const partes: string[] = [];
  for (const almacen of [localStorage, sessionStorage]) {
    for (let i = 0; i < almacen.length; i++) {
      const clave = almacen.key(i) ?? '';
      partes.push(`${clave}=${almacen.getItem(clave) ?? ''}`);
    }
  }
  return partes.join('\n');
}
