import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BuscadorReportesComponent } from '../compartido/buscador-reportes.component';
import { GraficoReporteComponent } from '../compartido/rep-grafico.component';
import { SemaforoReporteComponent } from '../compartido/rep-semaforo.component';
import { ApiService, ErrorDeApi, mensajeDeError } from '../core/api.service';
import { AvisosService } from '../core/avisos.service';
import { CatalogoService } from '../core/catalogo.service';
import { ROL_ANALISTA, ROL_INVERSIONISTA } from '../core/modelos';
import { nombreDeLaFecha, porcentaje, topeRedondo } from '../core/reportes';
import { ReportesService } from '../core/reportes.service';
import { SesionService } from '../core/sesion.service';
import {
  API,
  CLAVE_DEL_TOKEN,
  crearNavegacion,
  errorDe,
  esperar,
  limpiarTelefono,
  loGuardadoEnElTelefono,
  proveedores,
  punto,
  reporte,
  usuario,
} from './ayudas';

// Paso A11: 20 pruebas NO FUNCIONALES de la app (PA-21 a PA-40): seguridad, privacidad, fiabilidad,
// rendimiento, usabilidad y accesibilidad. Se corren con: npx ng test --watch=false

describe('Pruebas no funcionales de la app', () => {
  let navegacion: ReturnType<typeof crearNavegacion>;
  let http: HttpTestingController;

  beforeEach(() => {
    limpiarTelefono();
    navegacion = crearNavegacion();
    TestBed.configureTestingModule({
      declarations: [BuscadorReportesComponent, GraficoReporteComponent, SemaforoReporteComponent],
      providers: proveedores(navegacion),
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    limpiarTelefono();
  });

  // Inversionista con la sesión iniciada y sus favoritos ya cargados
  async function entrarConFavoritos(favoritos: string[], id = 'persona-1'): Promise<CatalogoService> {
    const sesion = TestBed.inject(SesionService);
    const catalogo = TestBed.inject(CatalogoService);
    sesion.guardarUsuario(usuario(ROL_INVERSIONISTA, { id }));
    TestBed.tick();
    http.expectOne(`${API}/favoritos`).flush(favoritos.map((property_id) => ({ property_id })));
    await esperar();
    return catalogo;
  }

  // El buscador del analista con unos resultados ya mostrados
  async function buscadorConResultados() {
    const fixture = TestBed.createComponent(BuscadorReportesComponent);
    fixture.detectChanges();
    const pagina = fixture.nativeElement as HTMLElement;
    const campo = pagina.querySelector('input') as HTMLInputElement;
    campo.value = 'casa';
    campo.dispatchEvent(new Event('input'));
    await esperar(350);
    http.expectOne(`${API}/reportes/buscar?q=casa`).flush({
      remates: [
        { id: 'r1', title: 'Casa en Maipú', comuna: 'Maipú', codigo: null, estado: 'Vigente' },
        { id: 'r2', title: 'Casa en Ñuñoa', comuna: 'Ñuñoa', codigo: null, estado: 'Vigente' },
      ],
    });
    await esperar();
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, pagina, campo };
  }

  // ---------- Seguridad ----------

  it('PA-21 · Seguridad: el token y la marca de la app solo se envían a la API de HouseGreen', () => {
    localStorage.setItem(CLAVE_DEL_TOKEN, 'token-guardado');
    const cliente = TestBed.inject(HttpClient);

    cliente.get(`${API}/propiedades`).subscribe();
    cliente.get('https://otro-sitio.cl/datos').subscribe();

    const aLaApi = http.expectOne(`${API}/propiedades`);
    expect(aLaApi.request.headers.get('Authorization')).toBe('Bearer token-guardado');
    expect(aLaApi.request.headers.get('X-Plataforma')).toBe('app');
    const aOtroSitio = http.expectOne('https://otro-sitio.cl/datos');
    expect(aOtroSitio.request.headers.has('Authorization')).toBe(false);
    expect(aOtroSitio.request.headers.has('X-Plataforma')).toBe(false);
  });

  it('PA-22 · Seguridad: sin sesión no se envía ningún token (la API responde solo lo público)', async () => {
    const catalogo = TestBed.inject(ApiService).get('/propiedades');

    const pedido = http.expectOne(`${API}/propiedades`);
    expect(pedido.request.headers.has('Authorization')).toBe(false);
    expect(pedido.request.headers.get('X-Plataforma')).toBe('app'); // el registro de actividad sabe que es la app
    pedido.flush([]);
    await catalogo;
  });

  it('PA-23 · Seguridad: si la sesión venció (401), se cierra y se vuelve al inicio de sesión', async () => {
    localStorage.setItem(CLAVE_DEL_TOKEN, 'token-vencido');
    const sesion = TestBed.inject(SesionService);
    sesion.guardarUsuario(usuario(ROL_INVERSIONISTA));
    const irA = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const pedido = TestBed.inject(ApiService).get('/alertas');
    http.expectOne(`${API}/alertas`).flush({ detail: 'Token inválido' }, { status: 401, statusText: 'Unauthorized' });
    const error = await errorDe(pedido);

    expect(error?.status).toBe(401);
    expect(sesion.conSesion()).toBe(false);
    expect(localStorage.getItem(CLAVE_DEL_TOKEN)).toBeNull();
    expect(irA).toHaveBeenCalledWith('/login');
  });

  it('PA-24 · Seguridad: la contraseña nunca se guarda en el teléfono (solo el token de la sesión)', async () => {
    const sesion = TestBed.inject(SesionService);

    const entrando = sesion.iniciarSesion('ana@correo.cl', 'MiClaveSecreta99');
    http.expectOne(`${API}/auth/login`).flush({ access_token: 'token-de-prueba', token_type: 'bearer', requires_2fa: false });
    await esperar();
    http.expectOne(`${API}/auth/me`).flush(usuario(ROL_INVERSIONISTA));
    await entrando;

    const guardado = loGuardadoEnElTelefono();
    expect(guardado).toBe(`${CLAVE_DEL_TOKEN}=token-de-prueba`);
    expect(guardado).not.toContain('MiClaveSecreta99');
  });

  it('PA-25 · Seguridad: si la API rechaza el token guardado al abrir la app, se borra del teléfono', async () => {
    localStorage.setItem(CLAVE_DEL_TOKEN, 'token-falso');
    const sesion = TestBed.inject(SesionService);

    const abriendo = sesion.iniciar();
    http.expectOne(`${API}/auth/me`).flush({ detail: 'Token inválido' }, { status: 401, statusText: 'Unauthorized' });
    await abriendo;

    expect(sesion.obtenerToken()).toBeNull();
    expect(localStorage.getItem(CLAVE_DEL_TOKEN)).toBeNull();
  });

  // ---------- Fiabilidad ----------

  it('PA-26 · Fiabilidad: si al abrir la app no hay conexión, la sesión no se pierde', async () => {
    localStorage.setItem(CLAVE_DEL_TOKEN, 'token-guardado');
    const sesion = TestBed.inject(SesionService);

    const abriendo = sesion.iniciar();
    http.expectOne(`${API}/auth/me`).error(new ProgressEvent('error'));
    await abriendo;

    expect(sesion.obtenerToken()).toBe('token-guardado');
    expect(localStorage.getItem(CLAVE_DEL_TOKEN)).toBe('token-guardado');
  });

  it('PA-27 · Fiabilidad: si la API no contesta a tiempo, la app deja de esperar y avisa', async () => {
    const api = TestBed.inject(ApiService);

    const pedido = api.get('/propiedades', 0.05); // en la app son 90 segundos; aquí 50 milisegundos
    const pendiente = http.expectOne(`${API}/propiedades`);
    const error = await errorDe(pedido);

    expect(error?.message).toBe('HouseGreen no respondió a tiempo. Inténtalo de nuevo en unos minutos.');
    expect(pendiente.cancelled).toBe(true); // ya no queda esperando
  });

  it('PA-28 · Usabilidad: los errores de la API se muestran en español y sin códigos técnicos', async () => {
    const api = TestBed.inject(ApiService);

    const sinConexion = api.get('/propiedades');
    http.expectOne(`${API}/propiedades`).error(new ProgressEvent('error'));
    expect((await errorDe(sinConexion))?.message).toBe(
      'No se pudo conectar con HouseGreen. Revisa tu conexión e inténtalo de nuevo.',
    );

    const conMotivo = api.post('/auth/registro', {});
    http.expectOne(`${API}/auth/registro`).flush({ detail: 'El correo ya está registrado.' }, { status: 400, statusText: 'Bad Request' });
    expect((await errorDe(conMotivo))?.message).toBe('El correo ya está registrado.');

    const datosMalos = api.post('/opiniones', {});
    http.expectOne(`${API}/opiniones`).flush({ detail: [{ loc: ['body', 'rating'] }] }, { status: 422, statusText: 'Unprocessable' });
    expect((await errorDe(datosMalos))?.message).toBe('Revisa los datos ingresados.');
  });

  it('PA-29 · Usabilidad: un error inesperado muestra un mensaje amable, nunca el detalle técnico', () => {
    expect(mensajeDeError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(
      'Ocurrió un error inesperado. Inténtalo de nuevo.',
    );
    expect(mensajeDeError(new ErrorDeApi('No tienes permiso para ver esto.', 403))).toBe('No tienes permiso para ver esto.');
  });

  it('PA-30 · Fiabilidad: los toques seguidos en un corazón van en orden y queda el último', async () => {
    const catalogo = await entrarConFavoritos([]);

    const guardar = catalogo.alternarFavorito('r1');
    const quitar = catalogo.alternarFavorito('r1'); // se arrepiente antes de que responda la API
    expect(catalogo.esFavorito('r1')).toBe(false);

    const primero = http.expectOne(`${API}/favoritos/r1`);
    expect(primero.request.method).toBe('POST');
    expect(http.match(`${API}/favoritos/r1`)).toHaveLength(0); // el segundo espera al primero
    primero.flush({});
    await esperar();
    const segundo = http.expectOne(`${API}/favoritos/r1`);
    expect(segundo.request.method).toBe('DELETE');
    segundo.flush(null);
    await Promise.all([guardar, quitar]);

    expect(catalogo.esFavorito('r1')).toBe(false);
  });

  it('PA-31 · Fiabilidad: si no se puede guardar un favorito, la pantalla vuelve a mostrar lo real', async () => {
    const catalogo = await entrarConFavoritos([]);

    const guardar = catalogo.alternarFavorito('r2');
    expect(catalogo.esFavorito('r2')).toBe(true);
    http.expectOne(`${API}/favoritos/r2`).flush({ detail: 'Error' }, { status: 500, statusText: 'Server Error' });
    await esperar();
    http.expectOne(`${API}/favoritos`).flush([]); // se vuelve a pedir la lista real
    const error = await errorDe(guardar);

    expect(error?.status).toBe(500);
    expect(catalogo.esFavorito('r2')).toBe(false);
  });

  // ---------- Privacidad ----------

  it('PA-32 · Privacidad: al cambiar de cuenta no se ven los favoritos de la cuenta anterior', async () => {
    const catalogo = await entrarConFavoritos(['r1'], 'cuenta-a');
    expect(catalogo.esFavorito('r1')).toBe(true);

    TestBed.inject(SesionService).guardarUsuario(usuario(ROL_INVERSIONISTA, { id: 'cuenta-b' }));
    expect(catalogo.esFavorito('r1')).toBe(false); // al tiro, antes de que llegue la lista de la otra cuenta

    TestBed.tick();
    http.expectOne(`${API}/favoritos`).flush([]);
  });

  it('PA-33 · Privacidad: el analista no pide alertas, anuncios ni favoritos de nadie', async () => {
    TestBed.inject(CatalogoService);
    TestBed.inject(AvisosService);

    TestBed.inject(SesionService).guardarUsuario(usuario(ROL_ANALISTA));
    TestBed.tick();
    await esperar();

    http.expectNone(`${API}/alertas`);
    http.expectNone(`${API}/anuncios`);
    http.expectNone(`${API}/favoritos`);
  });

  // ---------- Rendimiento ----------

  it('PA-34 · Rendimiento: el buscador espera a que se deje de escribir (una sola búsqueda)', async () => {
    const fixture = TestBed.createComponent(BuscadorReportesComponent);
    fixture.detectChanges();
    const campo = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;

    for (const texto of ['c', 'ca', 'cas', 'casa']) {
      campo.value = texto;
      campo.dispatchEvent(new Event('input'));
      await esperar(50);
    }
    await esperar(350);

    const busquedas = http.match((pedido) => pedido.url.startsWith(`${API}/reportes/buscar`));
    expect(busquedas).toHaveLength(1);
    expect(busquedas[0].request.url).toBe(`${API}/reportes/buscar?q=casa`);
    busquedas[0].flush({ remates: [] });
  });

  it('PA-35 · Rendimiento: el reporte del analista no se vuelve a pedir al cambiar de pantalla', async () => {
    TestBed.inject(SesionService).guardarUsuario(usuario(ROL_ANALISTA));
    const reportes = TestBed.inject(ReportesService);

    reportes.actualizar(); // Resumen
    http.expectOne(`${API}/comunas`).flush([{ id: 13, name: 'Ñuñoa' }]);
    http.expectOne(`${API}/reportes?periodo=mes`).flush(reporte('mes'));
    await esperar();
    reportes.actualizar(); // Subastas
    reportes.actualizar(); // Usuarios
    http.expectNone(`${API}/reportes?periodo=mes`);

    reportes.cambiarPeriodo('hoy'); // al cambiar el período, sí
    reportes.actualizar();
    http.expectOne(`${API}/reportes?periodo=hoy`).flush(reporte('hoy'));
  });

  it('PA-36 · Fiabilidad: una respuesta atrasada del reporte no reemplaza a la más nueva', async () => {
    TestBed.inject(SesionService).guardarUsuario(usuario(ROL_ANALISTA));
    const reportes = TestBed.inject(ReportesService);

    reportes.actualizar();
    http.expectOne(`${API}/comunas`).flush([{ id: 13, name: 'Ñuñoa' }]);
    const delMes = http.expectOne(`${API}/reportes?periodo=mes`);
    reportes.cambiarPeriodo('hoy');
    reportes.actualizar();
    http.expectOne(`${API}/reportes?periodo=hoy`).flush(reporte('hoy'));
    await esperar();
    delMes.flush(reporte('mes')); // llega después
    await esperar();

    expect(reportes.reporte()?.periodo).toBe('hoy');
    expect(reportes.cargando()).toBe(false);
  });

  // ---------- Accesibilidad ----------

  it('PA-37 · Accesibilidad: el semáforo nunca se explica solo con colores (nombre, cantidad y %)', () => {
    const fixture = TestBed.createComponent(SemaforoReporteComponent);
    fixture.componentRef.setInput('semaforo', { verde: 2, amarillo: 1, rojo: 1, sin_evaluar: 0 });
    fixture.detectChanges();
    const pagina = fixture.nativeElement as HTMLElement;

    const barra = pagina.querySelector('.rep-barra-semaforo') as HTMLElement;
    expect(barra.getAttribute('role')).toBe('img');
    expect(barra.getAttribute('aria-label')).toBe('Riesgo bajo: 2, Riesgo medio: 1, Riesgo alto: 1, Sin evaluar: 0');
    const leyenda = pagina.querySelectorAll('.rep-leyenda li');
    expect(leyenda).toHaveLength(4);
    expect(leyenda[0].textContent).toContain('Riesgo bajo');
    expect(leyenda[0].textContent).toContain('2');
    expect(leyenda[0].textContent).toContain('50 %');
  });

  it('PA-38 · Accesibilidad: el gráfico describe cada columna y trae sus datos en una tabla', () => {
    const fixture = TestBed.createComponent(GraficoReporteComponent);
    fixture.componentRef.setInput('serie', [punto('2026-10-24', { vistas: 3 }), punto('2026-10-25', { vistas: 1 })]);
    fixture.componentRef.setInput('medida', 'vistas');
    fixture.componentRef.setInput('agrupado', 'dia');
    fixture.detectChanges();
    const pagina = fixture.nativeElement as HTMLElement;

    const columna = pagina.querySelector('.rep-columna') as HTMLElement;
    expect(columna.getAttribute('aria-label')).toBe('24 oct 2026: 3 vistas');
    expect(columna.getAttribute('tabindex')).toBe('0'); // se puede llegar con el teclado
    expect(pagina.querySelector('.rep-tabla summary')?.textContent).toContain('Ver los datos en una tabla');
    expect(pagina.querySelectorAll('.rep-tabla tbody tr')).toHaveLength(2);
  });

  it('PA-39 · Accesibilidad: el buscador se puede usar solo con el teclado (flechas y Enter)', async () => {
    const { fixture, pagina, campo } = await buscadorConResultados();
    expect(campo.getAttribute('role')).toBe('combobox');
    expect(campo.getAttribute('aria-expanded')).toBe('true');

    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    const marcada = pagina.querySelector('[aria-selected="true"]') as HTMLElement;
    expect(marcada.textContent).toContain('Casa en Ñuñoa');
    expect(campo.getAttribute('aria-activedescendant')).toBe(marcada.id);

    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    expect(navegacion.navigateForward).toHaveBeenCalledWith('/analista/remate/r2');
  });

  it('PA-40 · Fiabilidad: las fechas de los gráficos no se corren un día y los porcentajes no fallan sin datos', () => {
    // Las fechas se arman a mano: new Date("2026-10-24") se lee en UTC y en Chile mostraría el 23
    expect(nombreDeLaFecha('2026-10-24')).toBe('24 oct');
    expect(nombreDeLaFecha('2026-10-24', true)).toBe('24 oct 2026');
    expect(nombreDeLaFecha('2026-10')).toBe('oct 2026');
    expect(nombreDeLaFecha('2026-10-24T14')).toBe('14:00');
    expect(porcentaje(3, 0)).toBe('0 %'); // sin total no se divide por cero
    expect(porcentaje(1, 3)).toBe('33 %');
    expect(topeRedondo(37)).toBe(50);
  });
});
