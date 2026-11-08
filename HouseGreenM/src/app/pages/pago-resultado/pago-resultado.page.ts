import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { pesos } from '../../core/remates';
import { SesionService } from '../../core/sesion.service';

// Paso A4: resultado del pago con Webpay, igual que en la web (PagoResultadoPage). La API, después de
// confirmar con Transbank, devuelve a la persona aquí: /premium/resultado?pago=<número del pago>.

type Estado = 'pendiente' | 'aprobado' | 'rechazado' | 'anulado' | 'error';

/** Lo que devuelve GET /pagos/{id} (nunca el número completo de la tarjeta: solo sus 4 últimos dígitos). */
interface Pago {
  id: number;
  status: Estado;
  amount: number;
  days: number;
  buy_order: string;
  authorization_code: string | null;
  payment_type_code: string | null;
  card_last_digits: string | null;
  premium_until: string | null;
}

const TIPO_DE_PAGO: Record<string, string> = {
  VD: 'Débito',
  VP: 'Prepago',
  VN: 'Crédito',
  VC: 'Crédito en cuotas',
  SI: 'Crédito, 3 cuotas sin interés',
  S2: 'Crédito, 2 cuotas sin interés',
  NC: 'Crédito, cuotas sin interés',
};

const TEXTOS: Record<Estado, { titulo: string; texto: string }> = {
  aprobado: { titulo: '¡Listo, ya eres Premium!', texto: 'Tu pago fue aprobado.' },
  rechazado: {
    titulo: 'El pago fue rechazado',
    texto: 'Webpay no autorizó el pago, así que no se hizo ningún cobro. Puedes intentarlo de nuevo.',
  },
  anulado: {
    titulo: 'El pago se anuló',
    texto: 'Se canceló en Webpay o se acabó el tiempo para pagar. No se hizo ningún cobro.',
  },
  error: {
    titulo: 'No pudimos confirmar el pago',
    texto: 'Hubo un problema al comunicarnos con Webpay. Si ves un cobro en tu tarjeta, cuéntanos desde Opinar.',
  },
  pendiente: {
    titulo: 'Tu pago todavía no se confirma',
    texto: 'Si cerraste la página de Webpay antes de terminar, vuelve al plan e inténtalo de nuevo.',
  },
};

/** "2026-12-03T..." -> "3 de diciembre de 2026" */
function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

@Component({
  selector: 'app-pago-resultado',
  templateUrl: './pago-resultado.page.html',
  styleUrls: ['./pago-resultado.page.scss'],
  standalone: false,
})
export class PagoResultadoPage {
  private ruta = inject(ActivatedRoute);
  private api = inject(ApiService);
  private sesion = inject(SesionService);

  readonly pago = signal<Pago | null>(null);
  readonly noEncontrado = signal(false);

  readonly textos = computed(() => {
    const pago = this.pago();
    return pago ? TEXTOS[pago.status] : null;
  });
  readonly aprobado = computed(() => this.pago()?.status === 'aprobado');
  readonly icono = computed(() => (this.aprobado() ? '✓' : this.pago()?.status === 'pendiente' ? '…' : '✕'));
  readonly monto = computed(() => pesos(this.pago()?.amount ?? 0));
  readonly hasta = computed(() => {
    const pago = this.pago();
    return pago && pago.status === 'aprobado' && pago.premium_until ? fechaLarga(pago.premium_until) : null;
  });
  // "Crédito · terminada en 6623"
  readonly tarjeta = computed(() => {
    const pago = this.pago();
    if (!pago?.card_last_digits) {
      return null;
    }
    const tipo = pago.payment_type_code ? `${TIPO_DE_PAGO[pago.payment_type_code] ?? pago.payment_type_code} · ` : '';
    return `${tipo}terminada en ${pago.card_last_digits}`;
  });

  async ionViewWillEnter() {
    const numero = this.ruta.snapshot.queryParamMap.get('pago');
    this.pago.set(null);
    this.noEncontrado.set(numero === null);
    if (numero === null) {
      return;
    }
    try {
      const pago = await this.api.get<Pago>(`/pagos/${encodeURIComponent(numero)}`);
      this.pago.set(pago);
      // Si se aprobó, se vuelve a preguntar quién es: así la app ya lo trata como Premium
      if (pago.status === 'aprobado') {
        await this.sesion.actualizarUsuario();
      }
    } catch {
      this.noEncontrado.set(true);
    }
  }
}
