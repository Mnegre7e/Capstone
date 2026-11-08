import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, TimeoutError, firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../environments/environment';

// Paso A1: todas las llamadas a la API pasan por aquí. Devuelven promesas (se usan con await) y,
// si algo falla, lanzan un ErrorDeApi con un mensaje en español que se puede mostrar tal cual.

export class ErrorDeApi extends Error {
  constructor(
    mensaje: string,
    public status: number, // 401, 403, 404... (0 = la API no respondió)
  ) {
    super(mensaje);
    this.name = 'ErrorDeApi';
  }
}

const ERROR_INESPERADO = 'Ocurrió un error inesperado. Inténtalo de nuevo.';

// Paso A4: si la API no contesta en este tiempo, se deja de esperar (así la app nunca queda colgada)
const SEGUNDOS_DE_ESPERA = 30;

/** El mensaje que se le muestra a la persona cuando algo falla. */
export function mensajeDeError(error: unknown): string {
  return error instanceof ErrorDeApi ? error.message : ERROR_INESPERADO;
}

function comoErrorDeApi(error: unknown): ErrorDeApi {
  if (error instanceof TimeoutError) {
    return new ErrorDeApi('HouseGreen no respondió a tiempo. Inténtalo de nuevo en unos minutos.', 0);
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return new ErrorDeApi('No se pudo conectar con HouseGreen. Revisa tu conexión e inténtalo de nuevo.', 0);
    }
    // FastAPI responde {"detail": "..."}; los datos mal escritos (422) traen una lista en vez de un texto
    const detalle: unknown = error.error?.detail;
    if (typeof detalle === 'string') {
      return new ErrorDeApi(detalle, error.status);
    }
    if (error.status === 422) {
      return new ErrorDeApi('Revisa los datos ingresados.', 422);
    }
    return new ErrorDeApi(`Error ${error.status}`, error.status);
  }
  return new ErrorDeApi(ERROR_INESPERADO, -1);
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  readonly url = environment.apiUrl;

  /** segundos: cuánto esperar la respuesta (por defecto 30). */
  get<T>(ruta: string, segundos = SEGUNDOS_DE_ESPERA): Promise<T> {
    return this.pedir(this.http.get<T>(this.url + ruta), segundos);
  }

  post<T>(ruta: string, cuerpo: unknown = {}): Promise<T> {
    return this.pedir(this.http.post<T>(this.url + ruta, cuerpo));
  }

  patch<T>(ruta: string, cuerpo: unknown = {}): Promise<T> {
    return this.pedir(this.http.patch<T>(this.url + ruta, cuerpo));
  }

  delete<T>(ruta: string): Promise<T> {
    return this.pedir(this.http.delete<T>(this.url + ruta));
  }

  /** Las fotos subidas a la API llegan como "/uploads/...": les falta la dirección de la API. */
  urlDeArchivo(url: string): string {
    return url.startsWith('/') ? this.url + url : url;
  }

  private async pedir<T>(peticion: Observable<T>, segundos = SEGUNDOS_DE_ESPERA): Promise<T> {
    try {
      return await firstValueFrom(peticion.pipe(timeout(segundos * 1000)));
    } catch (error) {
      throw comoErrorDeApi(error);
    }
  }
}
