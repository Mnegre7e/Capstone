import { Component, computed, inject, signal } from '@angular/core';

import { ApiService, mensajeDeError } from '../../core/api.service';

// Paso A13: registro de actividad (auditoría), igual que AdminAuditoriaPage de la web (antes estaba solo en la web).
// Todo lo que se hace en HouseGreen, desde la web o desde la app, queda anotado en la tabla audit_logs,
// que no se puede modificar ni borrar (GET /admin/auditoria).

// Lo que trae cada registro
interface Registro {
  id: number;
  created_at: string;
  email: string | null;
  nombre: string | null;
  rol: string | null; // inversionista, analista, administrador (vacío: correo no registrado)
  accion: string;
  entidad_tipo: string | null;
  entidad_id: string | null;
  entidad_nombre: string | null;
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
  ip: string | null;
  plataforma: string | null;
}

interface Pagina {
  total: number;
  registros: Registro[];
  hay_mas: boolean;
}

interface Filtros {
  periodo: string;
  rol: string;
  grupo: string;
  buscar: string;
}

/** Lo que se muestra de cada registro (y el nombre del día antes del primero de cada día). */
type Linea =
  | { tipo: 'dia'; clave: string; texto: string }
  | {
      tipo: 'registro';
      clave: string;
      hora: string;
      fallo: boolean;
      quien: string;
      texto: string;
      objeto: { nombre: string; enlace: string | null } | null;
      chip: string;
      sinCuenta: boolean;
      email: string | null;
      plataforma: string | null;
      filas: { nombre: string; antes: string | null; despues: string }[];
      ip: string | null;
    };

const FILTROS_INICIALES: Filtros = { periodo: '30d', rol: '', grupo: '', buscar: '' };

const ROLES = [
  { valor: '', nombre: 'Todas' },
  { valor: 'inversionista', nombre: 'Inversionistas' },
  { valor: 'analista', nombre: 'Analistas' },
  { valor: 'administrador', nombre: 'Administradores' },
  { valor: 'sin_cuenta', nombre: 'Correo no registrado' },
];

const GRUPOS = [
  { valor: '', nombre: 'Todo' },
  { valor: 'sesiones', nombre: 'Inicios de sesión' },
  { valor: 'intentos_fallidos', nombre: 'Intentos fallidos' },
  { valor: 'cuentas', nombre: 'Cuentas' },
  { valor: 'favoritos_y_alertas', nombre: 'Favoritos y alertas' },
  { valor: 'opiniones', nombre: 'Opiniones' },
  { valor: 'publicaciones', nombre: 'Publicaciones' },
  { valor: 'anuncios', nombre: 'Anuncios' },
];

const PERIODOS = [
  { valor: '7d', nombre: 'Últimos 7 días' },
  { valor: '30d', nombre: 'Últimos 30 días' },
  { valor: 'todo', nombre: 'Desde el inicio' },
];

const NOMBRE_DEL_ROL: Record<string, string> = {
  inversionista: 'Inversionista',
  analista: 'Analista',
  administrador: 'Administrador',
};

// Por qué no pudo entrar (lo anota la API en "motivo")
const MOTIVOS: Record<string, string> = {
  correo_no_registrado: 'el correo no está registrado',
  contrasena_incorrecta: 'contraseña incorrecta',
  cuenta_deshabilitada: 'la cuenta está suspendida',
  cuenta_eliminada: 'la cuenta fue eliminada',
  codigo_incorrecto: 'código de dos pasos incorrecto',
  demasiados_pedidos: 'pidió demasiados códigos seguidos (no se envió)',
};

// Nombres de los datos que aparecen en "Ver detalle"
const CAMPOS: Record<string, string> = {
  descripcion: 'Descripción',
  full_name: 'Nombre',
  phone: 'Teléfono',
  zona_de_precio: 'Zona de precio',
  dominio: 'Dominio',
  nivel: 'Semáforo',
  puntos: 'Puntos',
  estado: 'Estado',
  eliminada_el: 'La eliminó el',
  email: 'Correo',
  url: 'Foto',
  etiqueta: 'Etiqueta',
  posicion: 'Posición',
  fotos: 'Orden de las fotos',
  motivo: 'Motivo',
  dos_pasos: 'Usa verificación en dos pasos',
  calificacion: 'Calificación',
  tema: 'Tema',
  acepta_respuesta: 'Acepta respuesta',
  titulo: 'Título',
  audiencia: 'A quiénes',
  destinatarios: 'Personas que lo recibieron',
  por_correo: 'También por correo',
  intentos: 'Intentos con ese código',
  max_risk_level: 'Nivel máximo',
  max_price: 'Precio máximo',
  quitada_el: 'La había quitado el',
};

// Datos internos que no le sirven a quien lee el registro (la comuna de una alerta ya va en la frase)
const CAMPOS_OCULTOS = new Set(['foto_id', 'respuesta_id', 'comuna_id']);

const ES_FALLO = new Set(['inicio_sesion_fallido', 'inicio_sesion_bloqueado', 'recuperacion_fallida']);

// Las acciones sobre algo (una propiedad, una persona, un anuncio...): el nombre va al final de la frase
const CON_OBJETO: Record<string, string> = {
  cuenta_suspendida: 'suspendió la cuenta de ',
  cuenta_reactivada: 'reactivó la cuenta de ',
  favorito_agregado: 'guardó en favoritos ',
  favorito_quitado: 'quitó de favoritos ',
  alerta_creada: 'creó una alerta: ',
  alerta_eliminada: 'eliminó una alerta: ',
  opinion_respondida: 'respondió una opinión de ',
  descripcion_editada: 'editó la descripción de ',
  foto_subida: 'subió una foto a ',
  foto_quitada: 'quitó una foto de ',
  fotos_ordenadas: 'ordenó las fotos de ',
  semaforo_editado: 'cambió el semáforo de ',
  anuncio_enviado: 'envió el anuncio ',
  publicacion_quitada: 'quitó del catálogo ',
  publicacion_restaurada: 'volvió a publicar ',
};

// Las acciones de la persona sobre su propia cuenta
const SIN_OBJETO: Record<string, string> = {
  registro: 'se registró',
  inicio_sesion: 'inició sesión',
  inicio_sesion_bloqueado: 'quedó bloqueado por demasiados intentos fallidos',
  perfil_editado: 'editó su perfil',
  contrasena_cambiada: 'cambió su contraseña',
  dos_pasos_activada: 'activó la verificación en dos pasos',
  recuperacion_fallida: 'escribió mal el código para recuperar su contraseña',
  contrasena_recuperada: 'cambió su contraseña con un código enviado por correo',
  dos_pasos_desactivada: 'desactivó la verificación en dos pasos',
  cuenta_eliminada: 'eliminó su cuenta',
  opinion_enviada: 'envió una opinión',
};

// Fecha y hora en Chile
function dia(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function hora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function nombreDelDia(fechaIso: string): string {
  const fecha = new Date(fechaIso).toDateString();
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (fecha === hoy.toDateString()) return 'Hoy';
  if (fecha === ayer.toDateString()) return 'Ayer';
  const texto = dia(fechaIso);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Un valor de "antes" o "después", escrito para personas
function textoDelValor(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (campo === 'motivo' && typeof valor === 'string') return MOTIVOS[valor] ?? valor;
  if (campo === 'max_price' && typeof valor === 'string') {
    return Number(valor).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  }
  if ((campo === 'eliminada_el' || campo === 'quitada_el') && typeof valor === 'string') return `${dia(valor)}, ${hora(valor)}`;
  if (campo === 'fotos' && Array.isArray(valor)) {
    return valor.map((foto, i) => `${i + 1}. ${(foto as { etiqueta?: string | null }).etiqueta || 'sin etiqueta'}`).join(' · ');
  }
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

// Qué hizo, en palabras (y si va seguido del nombre de lo que tocó)
function frase(registro: Registro): { texto: string; conObjeto: boolean } {
  const motivo = registro.despues?.['motivo'];
  const conMotivo = typeof motivo === 'string' ? `: ${MOTIVOS[motivo] ?? motivo}` : '';
  if (registro.accion in CON_OBJETO) return { texto: CON_OBJETO[registro.accion], conObjeto: true };
  if (registro.accion === 'inicio_sesion_fallido') return { texto: `no pudo iniciar sesión${conMotivo}`, conObjeto: false };
  if (registro.accion === 'recuperacion_pedida') {
    return { texto: `pidió un código para recuperar su contraseña${conMotivo}`, conObjeto: false };
  }
  return { texto: SIN_OBJETO[registro.accion] ?? registro.accion.replace(/_/g, ' '), conObjeto: false };
}

// El nombre de la propiedad, persona, etc. Las propiedades llevan a su publicación.
function objetoDe(registro: Registro): { nombre: string; enlace: string | null } {
  const nombre = registro.entidad_nombre ?? '(ya no existe)';
  if (registro.entidad_tipo === 'propiedad' && registro.entidad_id) {
    return { nombre: `«${nombre}»`, enlace: registro.entidad_id };
  }
  if (registro.entidad_tipo === 'anuncio') return { nombre: `«${nombre}»`, enlace: null };
  return { nombre, enlace: null };
}

// "Ver detalle": lo que había antes y lo que quedó después
function filasDe(registro: Registro): { nombre: string; antes: string | null; despues: string }[] {
  const antes = registro.antes ?? {};
  const despues = registro.despues ?? {};
  const campos = [...new Set([...Object.keys(antes), ...Object.keys(despues)])].filter(
    (campo) => !CAMPOS_OCULTOS.has(campo) && !(campo === 'motivo' && registro.accion === 'inicio_sesion_fallido'),
  );
  const hayAntes = registro.antes !== null && Object.keys(antes).length > 0;
  return campos.map((campo) => {
    const cambio = hayAntes && campo in antes && campo in despues;
    return {
      nombre: CAMPOS[campo] ?? campo,
      antes: cambio ? textoDelValor(campo, antes[campo]) : null,
      despues: textoDelValor(campo, campo in despues ? despues[campo] : antes[campo]),
    };
  });
}

function armarRuta(filtros: Filtros, antesDe?: number): string {
  const parametros = new URLSearchParams({ periodo: filtros.periodo, limite: '50' });
  if (filtros.rol) parametros.set('rol', filtros.rol);
  if (filtros.grupo) parametros.set('grupo', filtros.grupo);
  if (filtros.buscar) parametros.set('buscar', filtros.buscar);
  if (antesDe !== undefined) parametros.set('antes_de', String(antesDe));
  return `/admin/auditoria?${parametros.toString()}`;
}

@Component({
  selector: 'app-auditoria',
  templateUrl: './auditoria.page.html',
  styleUrls: ['./auditoria.page.scss'],
  standalone: false,
})
export class AuditoriaPage {
  private api = inject(ApiService);

  readonly ROLES = ROLES;
  readonly GRUPOS = GRUPOS;
  readonly PERIODOS = PERIODOS;

  readonly filtros = signal<Filtros>(FILTROS_INICIALES);
  readonly textoBuscar = signal('');
  readonly pagina = signal<Pagina | null>(null);
  readonly cargando = signal(true);
  readonly cargandoMas = signal(false);
  readonly error = signal<string | null>(null);
  private turno = 0; // si cambian los filtros antes de que llegue la respuesta, se ignora la anterior

  readonly hayFiltros = computed(() => {
    const f = this.filtros();
    return f.rol !== '' || f.grupo !== '' || f.buscar !== '' || f.periodo !== FILTROS_INICIALES.periodo;
  });

  readonly textoCuenta = computed(() => {
    const pagina = this.pagina();
    if (this.cargando()) return 'Buscando...';
    if (!pagina) return '';
    const total = `${pagina.total.toLocaleString('es-CL')} ${pagina.total === 1 ? 'registro' : 'registros'}`;
    return pagina.total > pagina.registros.length ? `${total} · se muestran ${pagina.registros.length}` : total;
  });

  // Cada registro con lo que se muestra de él, y el nombre del día antes del primero de cada día
  readonly lineas = computed<Linea[]>(() => {
    const registros = this.pagina()?.registros ?? [];
    const lineas: Linea[] = [];
    registros.forEach((registro, i) => {
      const diaDeEste = nombreDelDia(registro.created_at);
      if (i === 0 || nombreDelDia(registros[i - 1].created_at) !== diaDeEste) {
        lineas.push({ tipo: 'dia', clave: `dia-${registro.id}`, texto: diaDeEste });
      }
      const { texto, conObjeto } = frase(registro);
      const sinCuenta = registro.rol === null;
      lineas.push({
        tipo: 'registro',
        clave: String(registro.id),
        hora: hora(registro.created_at),
        fallo: ES_FALLO.has(registro.accion),
        quien: registro.nombre ?? registro.email ?? 'Alguien',
        texto,
        objeto: conObjeto ? objetoDe(registro) : null,
        chip: sinCuenta ? 'Sin cuenta' : (NOMBRE_DEL_ROL[registro.rol ?? ''] ?? registro.rol ?? ''),
        sinCuenta,
        email: registro.nombre && registro.email ? registro.email : null,
        plataforma: registro.plataforma ? `desde la ${registro.plataforma === 'app' ? 'app' : 'web'}` : null,
        filas: filasDe(registro),
        ip: registro.ip,
      });
    });
    return lineas;
  });

  ionViewWillEnter() {
    void this.pedir();
  }

  // Pide la primera página con los filtros elegidos
  private async pedir() {
    const turno = ++this.turno;
    this.cargando.set(true);
    try {
      const datos = await this.api.get<Pagina>(armarRuta(this.filtros()));
      if (turno === this.turno) {
        this.pagina.set(datos);
        this.error.set(null);
      }
    } catch (error) {
      if (turno === this.turno) this.error.set(mensajeDeError(error));
    } finally {
      if (turno === this.turno) this.cargando.set(false);
    }
  }

  cambiarFiltro(cambio: Partial<Filtros>) {
    this.filtros.update((anteriores) => ({ ...anteriores, ...cambio }));
    void this.pedir();
  }

  buscar(evento: Event) {
    evento.preventDefault();
    const texto = this.textoBuscar().trim();
    if (texto !== this.filtros().buscar) this.cambiarFiltro({ buscar: texto });
  }

  limpiar() {
    this.textoBuscar.set('');
    this.filtros.set(FILTROS_INICIALES);
    void this.pedir();
  }

  // "Cargar más": pide los registros más antiguos que el último que se ve
  async cargarMas() {
    const pagina = this.pagina();
    if (!pagina || pagina.registros.length === 0) return;
    this.cargandoMas.set(true);
    try {
      const ultimo = pagina.registros[pagina.registros.length - 1];
      const mas = await this.api.get<Pagina>(armarRuta(this.filtros(), ultimo.id));
      this.pagina.set({ total: mas.total, registros: [...pagina.registros, ...mas.registros], hay_mas: mas.hay_mas });
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargandoMas.set(false);
    }
  }
}
