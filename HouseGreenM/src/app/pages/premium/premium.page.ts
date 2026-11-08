import { Component, computed, inject, signal } from '@angular/core';

import { ApiService, mensajeDeError } from '../../core/api.service';
import { ROL_ADMIN, ROL_ANALISTA } from '../../core/modelos';
import { BENEFICIOS_PREMIUM, DIAS_PREMIUM, PRECIO_PREMIUM_TEXTO } from '../../core/remates';
import { SesionService } from '../../core/sesion.service';

// Paso A4: la página del plan Premium, igual que en la web (PremiumPage). Explica qué incluye, cuánto cuesta
// y lleva a la página de pago de Webpay (Transbank). Al terminar, la API devuelve a /premium/resultado.

// Qué ve cada uno: [lo que se ve, sin plan, con Premium]
const COMPARACION: [string, boolean, boolean][] = [
  ['Catálogo de remates', true, true],
  ['Semáforo de riesgo (color)', false, true],
  ['Puntaje del semáforo y por qué lo tiene', false, true],
  ['Detalle de cada remate', false, true],
  ['Precio frente a la comuna', false, true],
  ['Datos del remate y fotos', false, true],
  ['Mapa de los remates', false, true],
  ['Favoritos y alertas', false, true],
];

/** "2026-12-03T..." -> "3 de diciembre de 2026" */
function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Webpay pide llegar a su página con un formulario (POST) que lleva el token de la transacción. */
function irAWebpay(url: string, token: string): void {
  const formulario = document.createElement('form');
  formulario.method = 'POST';
  formulario.action = url;
  const campo = document.createElement('input');
  campo.type = 'hidden';
  campo.name = 'token_ws';
  campo.value = token;
  formulario.appendChild(campo);
  document.body.appendChild(formulario);
  formulario.submit();
}

@Component({
  selector: 'app-premium',
  templateUrl: './premium.page.html',
  styleUrls: ['./premium.page.scss'],
  standalone: false,
})
export class PremiumPage {
  private api = inject(ApiService);
  private sesion = inject(SesionService);

  readonly COMPARACION = COMPARACION;
  readonly BENEFICIOS_PREMIUM = BENEFICIOS_PREMIUM;
  readonly PRECIO_PREMIUM_TEXTO = PRECIO_PREMIUM_TEXTO;
  readonly DIAS_PREMIUM = DIAS_PREMIUM;

  private usuario = this.sesion.usuario;
  // El administrador (y el analista) ven todo sin pagar
  readonly cuentaSinPago = computed(() => {
    const rol = this.usuario()?.role_id;
    return rol === ROL_ADMIN ? 'administrador' : rol === ROL_ANALISTA ? 'analista' : null;
  });
  readonly vigente = computed(() => this.usuario()?.acceso_completo ?? false);
  readonly activoHasta = computed(() => {
    const hasta = this.usuario()?.premium_until;
    return this.vigente() && hasta ? fechaLarga(hasta) : null;
  });
  readonly vencioEl = computed(() => {
    const hasta = this.usuario()?.premium_until;
    return !this.vigente() && hasta ? fechaLarga(hasta) : null;
  });

  readonly pagando = signal(false);
  readonly errorPago = signal<string | null>(null);

  async pagar() {
    this.pagando.set(true);
    this.errorPago.set(null);
    try {
      const respuesta = await this.api.post<{ url: string; token: string }>('/pagos/webpay');
      irAWebpay(respuesta.url, respuesta.token); // la app se va a la página de Webpay
    } catch (error) {
      this.errorPago.set(mensajeDeError(error));
      this.pagando.set(false);
    }
  }
}
