import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { SesionService } from './sesion.service';

// Paso A1: a cada llamada a la API le agrega el token de la sesión y "X-Plataforma: app"
// (así el registro de actividad sabe que la acción vino de la app). Solo a la API: el token
// nunca se envía a otros sitios.
export const tokenInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  if (!peticion.url.startsWith(environment.apiUrl)) {
    return siguiente(peticion);
  }
  const sesion = inject(SesionService);
  const router = inject(Router);
  const token = sesion.obtenerToken();

  let encabezados = peticion.headers.set('X-Plataforma', 'app');
  if (token) {
    encabezados = encabezados.set('Authorization', `Bearer ${token}`);
  }

  return siguiente(peticion.clone({ headers: encabezados })).pipe(
    catchError((error: unknown) => {
      // La sesión venció (el token dura 24 horas): se cierra y se vuelve al inicio de sesión
      if (token && error instanceof HttpErrorResponse && error.status === 401) {
        sesion.cerrarSesion();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
