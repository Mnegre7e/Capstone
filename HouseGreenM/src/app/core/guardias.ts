import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SesionService } from './sesion.service';

// Paso A1: quién puede abrir cada pantalla (se usan en app-routing.module.ts).
// La API igual revisa los permisos en cada llamada: esto es para no mostrar pantallas que no sirven.

/** Pantallas para quien NO inició sesión (login, registro...): si ya entró, va a su inicio. */
export const sinSesion: CanActivateFn = () => {
  const sesion = inject(SesionService);
  return sesion.conSesion() ? inject(Router).parseUrl(sesion.rutaDeInicio()) : true;
};

/** Pantallas solo para estos roles (1 inversionista, 2 analista, 3 administrador). */
export function soloRoles(...roles: number[]): CanActivateFn {
  return () => {
    const sesion = inject(SesionService);
    const router = inject(Router);
    const usuario = sesion.usuario();
    if (!usuario) {
      return router.parseUrl('/login');
    }
    return roles.includes(usuario.role_id) ? true : router.parseUrl(sesion.rutaDeInicio());
  };
}
