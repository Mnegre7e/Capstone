import { Component, computed, inject, signal } from '@angular/core';

import { textoCuando } from '../../core/admin';
import { ApiService, mensajeDeError } from '../../core/api.service';
import { fechaConAnio } from '../../core/opiniones';
import { normalizar, pesos } from '../../core/remates';

// Paso A13: pagos del plan Premium, igual que AdminPagosPage de la web (antes estaba solo en la web).
// Es solo para mirar: el plan lo activa únicamente un pago aprobado por Webpay (GET /admin/pagos).
// HouseGreen nunca guarda el número de la tarjeta: solo sus últimos 4 dígitos, que entrega Webpay.

// Cómo quedó un pago. "sin_terminar": quedó pendiente hace más de 15 minutos (la persona salió de Webpay sin pagar).
type EstadoPago = 'aprobado' | 'rechazado' | 'anulado' | 'error' | 'pendiente' | 'sin_terminar';

interface PagoAdmin {
  id: number;
  user_id: string;
  full_name: string | null;
  email: string | null;
  status: EstadoPago;
  amount: number;
  days: number;
  environment: string; // "integracion" = pago de prueba
  buy_order: string;
  authorization_code: string | null;
  payment_type_code: string | null;
  card_last_digits: string | null;
  premium_until: string | null;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

const POR_TANDA = 20; // cuántos pagos se muestran de una vez

const NOMBRE_ESTADO_PAGO: Record<EstadoPago, string> = {
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  anulado: 'Anulado',
  error: 'Con error',
  pendiente: 'En Webpay ahora',
  sin_terminar: 'Sin terminar',
};

// Lo mismo que muestra el comprobante del pago
const TIPO_DE_PAGO: Record<string, string> = {
  VD: 'Débito',
  VP: 'Prepago',
  VN: 'Crédito',
  VC: 'Crédito en cuotas',
  SI: 'Crédito, 3 cuotas sin interés',
  S2: 'Crédito, 2 cuotas sin interés',
  NC: 'Crédito, cuotas sin interés',
};

const FILTROS_ESTADO: { valor: '' | EstadoPago; nombre: string }[] = [
  { valor: '', nombre: 'Todos' },
  { valor: 'aprobado', nombre: 'Aprobados' },
  { valor: 'rechazado', nombre: 'Rechazados' },
  { valor: 'anulado', nombre: 'Anulados' },
  { valor: 'sin_terminar', nombre: 'Sin terminar' },
  { valor: 'error', nombre: 'Con error' },
  { valor: 'pendiente', nombre: 'En Webpay ahora' },
];

// Qué significa cada estado, en palabras simples (el motivo exacto, si Webpay lo dio, va aparte)
const EXPLICACION: Partial<Record<EstadoPago, string>> = {
  sin_terminar: 'La persona salió de Webpay sin terminar de pagar. No se cobró nada.',
  pendiente: 'La persona está en la página de Webpay en este momento.',
};

function numero(valor: number): string {
  return valor.toLocaleString('es-CL');
}

// "Prepago · terminada en 6590"
function textoTarjeta(pago: PagoAdmin): string | null {
  if (!pago.card_last_digits) return null;
  const tipo = pago.payment_type_code ? `${TIPO_DE_PAGO[pago.payment_type_code] ?? pago.payment_type_code} · ` : '';
  return `${tipo}terminada en ${pago.card_last_digits}`;
}

@Component({
  selector: 'app-pagos',
  templateUrl: './pagos.page.html',
  styleUrls: ['./pagos.page.scss'],
  standalone: false,
})
export class PagosPage {
  private api = inject(ApiService);

  readonly FILTROS_ESTADO = FILTROS_ESTADO;
  readonly NOMBRE_ESTADO_PAGO = NOMBRE_ESTADO_PAGO;

  readonly pagos = signal<PagoAdmin[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly estado = signal<'' | EstadoPago>(''); // vacío = todos
  readonly tanda = signal(POR_TANDA);

  private filtrados = computed(() => {
    const texto = normalizar(this.busqueda().trim());
    return this.pagos().filter(
      (p) =>
        (this.estado() === '' || p.status === this.estado()) &&
        (texto === '' ||
          normalizar(p.full_name ?? '').includes(texto) ||
          normalizar(p.email ?? '').includes(texto) ||
          p.buy_order.toLowerCase().includes(texto)),
    );
  });
  readonly cantidadFiltrados = computed(() => this.filtrados().length);

  readonly visibles = computed(() =>
    this.filtrados()
      .slice(0, this.tanda())
      .map((p) => {
        const tarjeta = textoTarjeta(p);
        return {
          p,
          monto: `${pesos(p.amount)}`,
          detalle: ` · Premium ${p.days} días${tarjeta ? ` · ${tarjeta}` : ''}`,
          premium:
            p.status === 'aprobado' && p.premium_until
              ? `Dio Premium hasta el ${fechaConAnio(p.premium_until)}` +
                (p.authorization_code ? ` · Código de autorización ${p.authorization_code}` : '')
              : null,
          explicacion: EXPLICACION[p.status] ?? null,
          motivo: p.status !== 'aprobado' && p.error_message ? `Motivo: ${p.error_message}` : null,
          meta: `${textoCuando(p.created_at)} · Orden ${p.buy_order}`,
        };
      }),
  );

  // Resumen de arriba: solo los pagos aprobados
  readonly resumen = computed(() => {
    const aprobados = this.pagos().filter((p) => p.status === 'aprobado');
    return {
      aprobados: numero(aprobados.length),
      total: pesos(aprobados.reduce((suma, p) => suma + p.amount, 0)),
      personas: numero(new Set(aprobados.map((p) => p.user_id)).size),
    };
  });

  readonly textoCuenta = computed(() =>
    this.cantidadFiltrados() === this.pagos().length
      ? `Mostrando ${this.visibles().length} de ${this.pagos().length}, del más nuevo al más antiguo`
      : `${this.cantidadFiltrados()} de ${this.pagos().length} coinciden con los filtros`,
  );

  async ionViewWillEnter() {
    try {
      this.pagos.set(await this.api.get<PagoAdmin[]>('/admin/pagos'));
      this.error.set(null);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  // Al cambiar un filtro se vuelve a la primera tanda
  buscar(valor: string) {
    this.busqueda.set(valor);
    this.tanda.set(POR_TANDA);
  }

  elegirEstado(valor: '' | EstadoPago) {
    this.estado.set(valor);
    this.tanda.set(POR_TANDA);
  }

  mostrarMas() {
    this.tanda.set(this.tanda() + POR_TANDA);
  }
}
