import { Component, computed, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular/lazy';

import { ApiService, mensajeDeError } from '../../core/api.service';
import { AnuncioRecibido, AvisosService } from '../../core/avisos.service';
import { CatalogoService } from '../../core/catalogo.service';
import { TEXTO_SIGUE_CARGANDO, avisoCorto, recargarConCirculo } from '../../core/recargar';
import { fechaConAnio } from '../../core/opiniones';
import { Remate, Riesgo, pesos, remateFinalizado, remateRetirado } from '../../core/remates';
import { SesionService } from '../../core/sesion.service';

// Paso A7: la página Alertas, igual que la web (AlertsPage + MisAnuncios). Antes tenía datos de ejemplo.
// - Arriba (o a la izquierda en pantallas anchas): lo que llegó, es decir, los anuncios del equipo y los remates
//   que calzan con las alertas.
// - Abajo (o a la derecha): las alertas de la persona, o sea, de qué quiere que le avisen.
// Todo se guarda en la API: una alerta creada aquí aparece en la web, y al revés.

/** Lo que devuelve la API por cada alerta (tabla saved_filters). */
interface AlertaGuardada {
  id: string;
  comuna_id: number | null; // null = cualquier comuna
  comuna_name: string | null;
  max_risk_level: Riesgo | null; // null = cualquier riesgo
  max_price: string | null; // null = sin tope de precio
  created_at: string;
}

const ORDEN_RIESGO: Record<Riesgo, number> = { verde: 0, amarillo: 1, rojo: 2 };
const LARGO_MAXIMO_DEL_PRECIO = 12; // cifras
const POR_TANDA = 10; // cuántos avisos se muestran de una vez

/** "Riesgo bajo o medio", o vacío si la alerta acepta cualquier riesgo. */
function textoDelRiesgo(nivel: Riesgo | null): string {
  if (nivel === 'verde') return 'Solo riesgo bajo';
  if (nivel === 'amarillo') return 'Riesgo bajo o medio';
  return '';
}

@Component({
  selector: 'app-alertas',
  templateUrl: './alertas.page.html',
  styleUrls: ['./alertas.page.scss'],
  standalone: false,
})
export class AlertasPage {
  private api = inject(ApiService);
  private catalogo = inject(CatalogoService);
  private sesion = inject(SesionService);
  readonly avisos = inject(AvisosService);
  private mensajes = inject(ToastController);

  readonly fechaConAnio = fechaConAnio;
  readonly conPremium = computed(() => this.sesion.usuario()?.acceso_completo ?? false);

  // ---------- Mis alertas ----------
  readonly alertas = signal<AlertaGuardada[] | null>(null); // null = todavía cargando
  readonly errorDeAlertas = signal('');
  readonly comunaId = signal(''); // vacío = cualquier comuna
  readonly riesgo = signal(''); // vacío = cualquier riesgo
  readonly precio = signal(''); // solo cifras; vacío = sin tope
  readonly guardando = signal(false);
  readonly errorDelFormulario = signal('');
  // El precio se muestra con puntos: 60000000 -> 60.000.000
  readonly precioConPuntos = computed(() => (this.precio() === '' ? '' : Number(this.precio()).toLocaleString('es-CL')));

  // Comunas ordenadas por nombre, para la lista del formulario
  readonly comunas = computed(() =>
    Object.entries(this.catalogo.comunasPorId())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  );

  // Cada alerta con sus textos y cuántos remates vigentes del catálogo la cumplen hoy
  readonly alertasConDetalle = computed(() =>
    (this.alertas() ?? []).map((alerta) => {
      const cuantos = this.calzanHoy(alerta);
      const condiciones =
        [textoDelRiesgo(alerta.max_risk_level), alerta.max_price !== null ? `Hasta ${pesos(Number(alerta.max_price))}` : '']
          .filter((texto) => texto !== '')
          .join(' · ') || 'Cualquier riesgo y precio';
      const hoy =
        cuantos === 0
          ? 'Hoy ningún remate vigente la cumple'
          : cuantos === 1
            ? 'Hoy la cumple 1 remate vigente'
            : `Hoy la cumplen ${cuantos.toLocaleString('es-CL')} remates vigentes`;
      return {
        id: alerta.id,
        comuna: alerta.comuna_id === null ? 'Cualquier comuna' : (alerta.comuna_name ?? 'Comuna desconocida'),
        condiciones,
        hoy,
      };
    }),
  );

  // ---------- Lo que llegó ----------
  readonly tanda = signal(POR_TANDA);
  private propiedadesPorId = computed(() => new Map(this.catalogo.remates().map((r) => [r.id, r])));
  readonly avisosVisibles = computed(() =>
    this.avisos
      .notificaciones()
      .slice(0, this.tanda())
      .map((aviso) => {
        const propiedad = aviso.property_id ? this.propiedadesPorId().get(aviso.property_id) : undefined;
        const terminado = propiedad
          ? remateRetirado(propiedad.status)
            ? 'Remate retirado'
            : remateFinalizado(propiedad.auction_date)
              ? 'Remate finalizado'
              : null
          : null;
        const detalle = [
          aviso.alert_type === 'cambio_semaforo' ? 'Bajó su nivel de riesgo' : '',
          propiedad ? (this.catalogo.comunasPorId()[propiedad.comuna_id] ?? 'Comuna desconocida') : '',
          propiedad ? pesos(Number(propiedad.opening_price)) : '',
          `Avisado el ${fechaConAnio(aviso.created_at)}`,
        ]
          .filter((texto) => texto !== '')
          .join(' · ');
        return { aviso, riesgo: propiedad?.evaluation?.result_level ?? null, terminado, detalle };
      }),
  );
  readonly avisosOcultos = computed(() => this.avisos.notificaciones().length - this.avisosVisibles().length);

  // ---------- Anuncios ----------
  readonly anuncioAbierto = signal<string | null>(null); // id del anuncio abierto (uno a la vez)
  readonly tandaAnuncios = signal(POR_TANDA);
  readonly anunciosVisibles = computed(() => this.avisos.anuncios().slice(0, this.tandaAnuncios()));
  readonly anunciosOcultos = computed(() => this.avisos.anuncios().length - this.anunciosVisibles().length);

  ionViewWillEnter() {
    // Cada vez que se entra se piden los avisos, los anuncios y las alertas
    void this.avisos.recargar();
    void this.cargarAlertas();
    if (this.catalogo.remates().length === 0) {
      void this.catalogo.recargar();
    }
  }

  // Paso A20: tirar la pantalla hacia abajo vuelve a pedir todo y avisa abajo que se actualizó
  async refrescar(evento: Event) {
    const termino = await recargarConCirculo(evento, () =>
      Promise.all([this.avisos.recargar(), this.cargarAlertas(), this.catalogo.recargar()]),
    );
    void avisoCorto(this.mensajes, termino ? 'Alertas actualizadas.' : TEXTO_SIGUE_CARGANDO);
  }

  private async cargarAlertas() {
    try {
      this.alertas.set(await this.api.get<AlertaGuardada[]>('/alertas/filtros'));
      this.errorDeAlertas.set('');
    } catch (error) {
      this.errorDeAlertas.set(mensajeDeError(error));
    }
  }

  /** Cuántos remates vigentes del catálogo cumplen hoy las condiciones de una alerta. */
  private calzanHoy(alerta: AlertaGuardada): number {
    return this.catalogo.remates().filter((remate: Remate) => {
      if (remateFinalizado(remate.auction_date) || remateRetirado(remate.status)) return false;
      if (alerta.comuna_id !== null && remate.comuna_id !== alerta.comuna_id) return false;
      if (alerta.max_price !== null && Number(remate.opening_price) > Number(alerta.max_price)) return false;
      if (alerta.max_risk_level !== null) {
        if (!remate.evaluation) return false;
        if (ORDEN_RIESGO[remate.evaluation.result_level] > ORDEN_RIESGO[alerta.max_risk_level]) return false;
      }
      return true;
    }).length;
  }

  /** El precio se escribe solo con cifras (máximo 12) y se muestra con puntos. */
  escribirPrecio(evento: Event) {
    const campo = evento.target as HTMLInputElement;
    this.precio.set(campo.value.replace(/\D/g, '').slice(0, LARGO_MAXIMO_DEL_PRECIO));
    campo.value = this.precioConPuntos();
  }

  async crearAlerta() {
    this.errorDelFormulario.set('');
    if (this.comunaId() === '' && this.riesgo() === '' && this.precio() === '') {
      this.errorDelFormulario.set('Elige al menos una condición: comuna, riesgo o precio.');
      return;
    }
    this.guardando.set(true);
    try {
      const nueva = await this.api.post<AlertaGuardada>('/alertas/filtros', {
        comuna_id: this.comunaId() === '' ? null : Number(this.comunaId()),
        max_risk_level: this.riesgo() === '' ? null : this.riesgo(),
        max_price: this.precio() === '' ? null : Number(this.precio()),
      });
      this.alertas.update((actuales) => [nueva, ...(actuales ?? [])]); // la nueva queda primero
      this.comunaId.set('');
      this.riesgo.set('');
      this.precio.set('');
    } catch (error) {
      this.errorDelFormulario.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminarAlerta(id: string) {
    this.errorDeAlertas.set('');
    try {
      await this.api.delete(`/alertas/filtros/${id}`);
      this.alertas.update((actuales) => (actuales ?? []).filter((alerta) => alerta.id !== id));
    } catch (error) {
      this.errorDeAlertas.set(mensajeDeError(error));
    }
  }

  alternarAnuncio(anuncio: AnuncioRecibido) {
    if (this.anuncioAbierto() === anuncio.id) {
      this.anuncioAbierto.set(null);
      return;
    }
    this.anuncioAbierto.set(anuncio.id);
    this.avisos.marcarAnuncioLeido(anuncio.id);
  }
}
