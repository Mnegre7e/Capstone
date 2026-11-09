import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BuscadorReportesComponent } from '../compartido/buscador-reportes.component';
import { BarrasReporteComponent } from '../compartido/rep-barras.component';
import { GraficoReporteComponent } from '../compartido/rep-grafico.component';
import { estadoPublicacion, textoZona } from '../core/admin';
import { AvisosService } from '../core/avisos.service';
import { CatalogoService } from '../core/catalogo.service';
import { problemaDeContrasena } from '../core/contrasena';
import { sinSesion, soloRoles } from '../core/guardias';
import { ROL_ADMIN, ROL_ANALISTA, ROL_INVERSIONISTA } from '../core/modelos';
import { categoriaDeTipo } from '../core/remates';
import { ReportesService } from '../core/reportes.service';
import { SesionService } from '../core/sesion.service';
import {
  API,
  CLAVE_DEL_TOKEN,
  crearMenu,
  crearNavegacion,
  esperar,
  limpiarTelefono,
  proveedores,
  punto,
  reporte,
  usuario,
} from './ayudas';

// Paso A11: 20 pruebas FUNCIONALES de la app (PA-01 a PA-20): revisan que cada función haga lo que debe,
// con los mismos pedidos a la API que hace la web. Se corren con: npx ng test --watch=false

describe('Pruebas funcionales de la app', () => {
  let navegacion: ReturnType<typeof crearNavegacion>;
  let menu: ReturnType<typeof crearMenu>;
  let http: HttpTestingController;

  beforeEach(() => {
    limpiarTelefono();
    navegacion = crearNavegacion();
    menu = crearMenu();
    TestBed.configureTestingModule({
      declarations: [BuscadorReportesComponent, GraficoReporteComponent, BarrasReporteComponent],
      providers: proveedores(navegacion, menu),
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    limpiarTelefono();
  });

  // Revisa una guardia de las rutas como lo hace el router (sin abrir la pantalla)
  function revisarGuardia(guardia: typeof sinSesion): string | true {
    const resultado = TestBed.runInInjectionContext(() =>
      guardia({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    return resultado instanceof UrlTree ? TestBed.inject(Router).serializeUrl(resultado) : (resultado as true);
  }

  // ---------- Sesión ----------

  it('PA-01 · Iniciar sesión: envía el correo y la contraseña, guarda la sesión y carga a la persona', async () => {
    const sesion = TestBed.inject(SesionService);

    const resultado = sesion.iniciarSesion('ana@correo.cl', 'clave1234');
    const login = http.expectOne(`${API}/auth/login`);
    expect(login.request.method).toBe('POST');
    expect(login.request.body).toEqual({ email: 'ana@correo.cl', password: 'clave1234', code: null });
    login.flush({ access_token: 'token-de-prueba', token_type: 'bearer', requires_2fa: false });
    await esperar();
    http.expectOne(`${API}/auth/me`).flush(usuario(ROL_INVERSIONISTA, { full_name: 'Ana Pérez' }));

    expect(await resultado).toBe('listo');
    expect(sesion.conSesion()).toBe(true);
    expect(sesion.usuario()?.full_name).toBe('Ana Pérez');
    expect(localStorage.getItem(CLAVE_DEL_TOKEN)).toBe('token-de-prueba');
  });

  it('PA-02 · Verificación en dos pasos: si la cuenta la tiene, pide el código y lo envía', async () => {
    const sesion = TestBed.inject(SesionService);

    const sinCodigo = sesion.iniciarSesion('admin@correo.cl', 'clave1234');
    http.expectOne(`${API}/auth/login`).flush({ access_token: null, token_type: 'bearer', requires_2fa: true });
    expect(await sinCodigo).toBe('pide_codigo');
    expect(sesion.obtenerToken()).toBeNull(); // sin el código no hay sesión

    const conCodigo = sesion.iniciarSesion('admin@correo.cl', 'clave1234', '123456');
    const login = http.expectOne(`${API}/auth/login`);
    expect(login.request.body).toEqual({ email: 'admin@correo.cl', password: 'clave1234', code: '123456' });
    login.flush({ access_token: 'token-admin', token_type: 'bearer', requires_2fa: false });
    await esperar();
    http.expectOne(`${API}/auth/me`).flush(usuario(ROL_ADMIN));
    expect(await conCodigo).toBe('listo');
  });

  it('PA-03 · Cada tipo de cuenta parte en su pantalla, igual que en la web', () => {
    const sesion = TestBed.inject(SesionService);

    sesion.guardarUsuario(usuario(ROL_INVERSIONISTA));
    expect(sesion.rutaDeInicio()).toBe('/catalogo-propiedades');
    sesion.guardarUsuario(usuario(ROL_ANALISTA));
    expect(sesion.rutaDeInicio()).toBe('/analista/resumen');
    sesion.guardarUsuario(usuario(ROL_ADMIN));
    expect(sesion.rutaDeInicio()).toBe('/admin-home');
  });

  it('PA-04 · Cerrar sesión: borra la sesión del teléfono, cierra el menú y vuelve al inicio de sesión', async () => {
    localStorage.setItem(CLAVE_DEL_TOKEN, 'token-guardado');
    const sesion = TestBed.inject(SesionService);
    sesion.guardarUsuario(usuario(ROL_INVERSIONISTA));

    await sesion.salir();

    expect(sesion.conSesion()).toBe(false);
    expect(sesion.obtenerToken()).toBeNull();
    expect(localStorage.getItem(CLAVE_DEL_TOKEN)).toBeNull();
    expect(menu.close).toHaveBeenCalled();
    expect(navegacion.navigateRoot).toHaveBeenCalledWith('/login');
  });

  it('PA-05 · Al abrir la app se recuerda la sesión: pregunta a la API de quién es el token guardado', async () => {
    localStorage.setItem(CLAVE_DEL_TOKEN, 'token-guardado');
    const sesion = TestBed.inject(SesionService);

    const abriendo = sesion.iniciar();
    const yo = http.expectOne(`${API}/auth/me`);
    expect(yo.request.headers.get('Authorization')).toBe('Bearer token-guardado');
    yo.flush(usuario(ROL_INVERSIONISTA, { full_name: 'Ana Pérez' }));
    await abriendo;

    expect(sesion.usuario()?.full_name).toBe('Ana Pérez');
  });

  it('PA-06 · Cada pantalla es solo para su tipo de cuenta (sin sesión se va al inicio de sesión)', () => {
    const sesion = TestBed.inject(SesionService);
    const soloAdmin = soloRoles(ROL_ADMIN);

    expect(revisarGuardia(soloAdmin)).toBe('/login');
    sesion.guardarUsuario(usuario(ROL_ANALISTA));
    expect(revisarGuardia(soloAdmin)).toBe('/analista/resumen'); // el analista vuelve a su inicio
    sesion.guardarUsuario(usuario(ROL_ADMIN));
    expect(revisarGuardia(soloAdmin)).toBe(true);
  });

  it('PA-07 · El inicio de sesión y el registro son solo para quien no ha entrado', () => {
    const sesion = TestBed.inject(SesionService);

    expect(revisarGuardia(sinSesion)).toBe(true);
    sesion.guardarUsuario(usuario(ROL_INVERSIONISTA));
    expect(revisarGuardia(sinSesion)).toBe('/catalogo-propiedades');
  });

  // ---------- Remates y favoritos ----------

  it('PA-08 · Catálogo: pide los remates y las comunas a la API (GET /propiedades y /comunas)', async () => {
    const catalogo = TestBed.inject(CatalogoService);

    const cargando = catalogo.recargar();
    http.expectOne(`${API}/propiedades`).flush([{ id: 'r1', title: 'Casa en Ñuñoa', comuna_id: 13 }]);
    http.expectOne(`${API}/comunas`).flush([{ id: 13, name: 'Ñuñoa' }]);
    await cargando;

    expect(catalogo.remates()).toHaveLength(1);
    expect(catalogo.comunasPorId()[13]).toBe('Ñuñoa');
    expect(catalogo.cargando()).toBe(false);
    expect(catalogo.error()).toBeNull();
  });

  it('PA-09 · Guardar y quitar un favorito: el corazón cambia al tiro y queda en la base (POST y DELETE)', async () => {
    const sesion = TestBed.inject(SesionService);
    const catalogo = TestBed.inject(CatalogoService);
    sesion.guardarUsuario(usuario(ROL_INVERSIONISTA));
    TestBed.tick();
    http.expectOne(`${API}/favoritos`).flush([{ property_id: 'r1' }]);
    await esperar();

    const guardar = catalogo.alternarFavorito('r2');
    expect(catalogo.esFavorito('r2')).toBe(true);
    const post = http.expectOne(`${API}/favoritos/r2`);
    expect(post.request.method).toBe('POST');
    post.flush({});
    await guardar;

    const quitar = catalogo.alternarFavorito('r1');
    expect(catalogo.esFavorito('r1')).toBe(false);
    const borrar = http.expectOne(`${API}/favoritos/r1`);
    expect(borrar.request.method).toBe('DELETE');
    borrar.flush(null);
    await quitar;

    expect(catalogo.esFavorito('r1')).toBe(false);
    expect(catalogo.esFavorito('r2')).toBe(true);
  });

  it('PA-10 · Al entrar se piden los favoritos de la persona (el analista no tiene favoritos)', async () => {
    const sesion = TestBed.inject(SesionService);
    const catalogo = TestBed.inject(CatalogoService);

    sesion.guardarUsuario(usuario(ROL_INVERSIONISTA));
    TestBed.tick();
    http.expectOne(`${API}/favoritos`).flush([{ property_id: 'r7' }]);
    await esperar();
    expect(catalogo.esFavorito('r7')).toBe(true);

    sesion.guardarUsuario(usuario(ROL_ANALISTA));
    TestBed.tick();
    await esperar();
    http.expectNone(`${API}/favoritos`);
  });

  // ---------- Alertas y anuncios ----------

  it('PA-11 · Alertas: el número del menú suma los avisos y los anuncios sin leer', async () => {
    const sesion = TestBed.inject(SesionService);
    const avisos = TestBed.inject(AvisosService);

    sesion.guardarUsuario(usuario(ROL_INVERSIONISTA));
    TestBed.tick();
    http.expectOne(`${API}/alertas`).flush([
      { id: 'n1', property_id: 'r1', property_title: 'Casa', alert_type: 'nueva_propiedad', message: 'Nuevo', is_read: false, created_at: '2026-11-08T10:00:00Z' },
      { id: 'n2', property_id: 'r2', property_title: 'Depto', alert_type: 'cambio_semaforo', message: 'Bajó', is_read: true, created_at: '2026-11-07T10:00:00Z' },
    ]);
    http.expectOne(`${API}/anuncios`).flush([
      { id: 'a1', title: 'Novedades', message: 'Hola', created_at: '2026-11-08T09:00:00Z', read_at: null, property_id: null, publicacion: null },
    ]);
    await esperar();

    expect(avisos.noLeidas()).toBe(1);
    expect(avisos.anunciosSinLeer()).toBe(1);
    expect(avisos.pendientes()).toBe(2);
  });

  it('PA-12 · Marcar un aviso como leído: baja el número y se guarda en la base (PATCH)', async () => {
    const sesion = TestBed.inject(SesionService);
    const avisos = TestBed.inject(AvisosService);
    sesion.guardarUsuario(usuario(ROL_INVERSIONISTA));
    TestBed.tick();
    http.expectOne(`${API}/alertas`).flush([
      { id: 'n1', property_id: 'r1', property_title: 'Casa', alert_type: 'nueva_propiedad', message: 'Nuevo', is_read: false, created_at: '2026-11-08T10:00:00Z' },
    ]);
    http.expectOne(`${API}/anuncios`).flush([]);
    await esperar();

    avisos.marcarLeida('n1');

    expect(avisos.pendientes()).toBe(0);
    const leida = http.expectOne(`${API}/alertas/n1/leida`);
    expect(leida.request.method).toBe('PATCH');
    leida.flush({});
  });

  // ---------- Reglas compartidas con la web ----------

  it('PA-13 · La contraseña sigue las mismas reglas que la web y la API (8 a 64, letra y número)', () => {
    expect(problemaDeContrasena('abc12')).toContain('al menos 8 caracteres');
    expect(problemaDeContrasena('abcdefgh')).toContain('al menos un número');
    expect(problemaDeContrasena('12345678')).toContain('al menos una letra');
    expect(problemaDeContrasena('a'.repeat(60) + '12345')).toContain('como máximo 64');
    expect(problemaDeContrasena('clave1234')).toBeNull();
    expect(problemaDeContrasena('contraseña1')).toBeNull();
  });

  it('PA-14 · Los tipos de propiedad se agrupan en las mismas 8 categorías del catálogo de la web', () => {
    expect(categoriaDeTipo('Parcela con casa')).toBe('parcela');
    expect(categoriaDeTipo('Casa')).toBe('casa');
    expect(categoriaDeTipo('Departamento')).toBe('departamento');
    expect(categoriaDeTipo('Sitio')).toBe('terreno');
    expect(categoriaDeTipo('Derechos sobre propiedad')).toBe('derechos');
    expect(categoriaDeTipo('Estacionamiento')).toBe('bodega');
    expect(categoriaDeTipo('Local comercial')).toBe('comercial');
    expect(categoriaDeTipo('Galpón')).toBe('otro');
  });

  it('PA-15 · Administrador: el estado y la zona de cada publicación se calculan igual que en la web', () => {
    const futuro = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const pasado = '2020-03-10T15:00:00Z';

    expect(estadoPublicacion({ status: 'vigente', auction_date: futuro, removed_at: '2026-11-01T10:00:00Z' })).toBe('quitada');
    expect(estadoPublicacion({ status: 'retirada', auction_date: futuro, removed_at: null })).toBe('retirada');
    expect(estadoPublicacion({ status: 'vigente', auction_date: pasado, removed_at: null })).toBe('finalizada');
    expect(estadoPublicacion({ status: 'vigente', auction_date: futuro, removed_at: null })).toBe('vigente');
    expect(textoZona({ result_level: 'verde', total_points: 7 })).toBe('Verde · 7/8');
    expect(textoZona({ result_level: null, total_points: null })).toBe('Sin evaluar');
  });

  // ---------- Analista ----------

  it('PA-16 · Reportes: el período y los filtros elegidos se envían a la API (GET /reportes)', async () => {
    const sesion = TestBed.inject(SesionService);
    const reportes = TestBed.inject(ReportesService);
    sesion.guardarUsuario(usuario(ROL_ANALISTA));

    reportes.actualizar(); // al abrir la pantalla (se reinicia para esta cuenta)
    reportes.cambiarPeriodo('semana');
    reportes.cambiarFiltro({ comuna: '13', tipo: 'casa', semaforo: 'verde' });
    reportes.actualizar();

    http.expectOne(`${API}/comunas`).flush([{ id: 13, name: 'Ñuñoa' }]);
    http.expectOne(`${API}/reportes?periodo=mes`).flush(reporte('mes'));
    http.expectOne(`${API}/reportes?periodo=semana&comuna_id=13&tipo=casa&semaforo=verde`).flush(reporte('semana'));
    await esperar();

    expect(reportes.reporte()?.periodo).toBe('semana');
    expect(reportes.cargando()).toBe(false);
    expect(reportes.comunas()).toEqual([{ id: '13', nombre: 'Ñuñoa' }]);
  });

  it('PA-17 · Rango de fechas del analista: revisa las fechas antes de pedir el reporte', () => {
    const reportes = TestBed.inject(ReportesService);

    reportes.cambiarPeriodo('rango');
    expect(reportes.consulta()).toBeNull(); // se pide recién al tocar «Ver»

    reportes.cambiarRango({ desde: '2026-10-20', hasta: '2026-10-10' });
    reportes.pedirRango();
    expect(reportes.errorDelRango()).toBe('La fecha de inicio no puede ser posterior a la de término.');

    reportes.cambiarRango({ desde: '2999-01-01', hasta: '2999-01-02' });
    reportes.pedirRango();
    expect(reportes.errorDelRango()).toBe('El rango no puede empezar en el futuro.');

    reportes.cambiarRango({ desde: '2026-10-01', hasta: '2026-10-15' });
    reportes.pedirRango();
    expect(reportes.errorDelRango()).toBeNull();
    expect(reportes.consulta()).toBe('periodo=rango&desde=2026-10-01&hasta=2026-10-15');
  });

  it('PA-18 · Buscador del analista: busca el remate en la API y al elegirlo abre su ficha', async () => {
    const fixture = TestBed.createComponent(BuscadorReportesComponent);
    fixture.detectChanges();
    const pagina = fixture.nativeElement as HTMLElement;
    const campo = pagina.querySelector('input') as HTMLInputElement;

    campo.value = 'casa ñuñoa';
    campo.dispatchEvent(new Event('input'));
    await esperar(350);
    http
      .expectOne(`${API}/reportes/buscar?q=${encodeURIComponent('casa ñuñoa')}`)
      .flush({ remates: [{ id: 'r9', title: 'Casa en Ñuñoa', comuna: 'Ñuñoa', codigo: '123', estado: 'Vigente' }] });
    await esperar();
    fixture.detectChanges();
    await fixture.whenStable();

    const opcion = pagina.querySelector('[role="option"]') as HTMLElement;
    expect(opcion.textContent).toContain('Casa en Ñuñoa');
    expect(opcion.textContent).toContain('Ñuñoa · código 123 · Vigente');
    opcion.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(navegacion.navigateForward).toHaveBeenCalledWith('/analista/remate/r9');
  });

  it('PA-19 · Gráfico de los reportes: al tocar una columna se ve su número y su fecha', async () => {
    const fixture = TestBed.createComponent(GraficoReporteComponent);
    fixture.componentRef.setInput('serie', [punto('2026-10-24', { vistas: 3 }), punto('2026-10-25', { vistas: 1 })]);
    fixture.componentRef.setInput('medida', 'vistas');
    fixture.componentRef.setInput('agrupado', 'dia');
    fixture.detectChanges();
    const pagina = fixture.nativeElement as HTMLElement;

    const columnas = pagina.querySelectorAll<HTMLElement>('.rep-columna');
    expect(columnas).toHaveLength(2);
    columnas[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    const globo = pagina.querySelector('.rep-globo') as HTMLElement;
    expect(globo.textContent).toContain('3 vistas');
    expect(globo.textContent).toContain('24 oct 2026');
  });

  it('PA-20 · Barras de los reportes: una fila por comuna con su número y su porcentaje', () => {
    const fixture = TestBed.createComponent(BarrasReporteComponent);
    fixture.componentRef.setInput('filas', [
      { nombre: 'Ñuñoa', cantidad: 6 },
      { nombre: 'Maipú', cantidad: 3 },
    ]);
    fixture.componentRef.setInput('total', 12);
    fixture.componentRef.setInput('vacio', 'No hay remates vigentes.');
    fixture.detectChanges();
    const pagina = fixture.nativeElement as HTMLElement;

    const filas = pagina.querySelectorAll('li');
    expect(filas).toHaveLength(2);
    expect(filas[0].textContent).toContain('Ñuñoa');
    expect(filas[0].textContent).toContain('6');
    expect(filas[0].textContent).toContain('50 %');
    const rellenos = pagina.querySelectorAll<HTMLElement>('.rep-barras-relleno');
    expect(rellenos[0].style.width).toBe('100%'); // la más grande ocupa todo el largo
    expect(rellenos[1].style.width).toBe('50%');
  });
});
