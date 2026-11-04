// Paso 122e: tipos y textos de los pagos del plan Premium que usan el Panel, Pagos y Usuarios del admin

// Cómo quedó un pago (GET /admin/pagos). "sin_terminar": quedó pendiente hace más de 15 minutos,
// o sea, la persona salió de Webpay sin pagar (no se cobró nada).
export type EstadoPago = "aprobado" | "rechazado" | "anulado" | "error" | "pendiente" | "sin_terminar";

export interface PagoAdmin {
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

export const NOMBRE_ESTADO_PAGO: Record<EstadoPago, string> = {
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  anulado: "Anulado",
  error: "Con error",
  pendiente: "En Webpay ahora",
  sin_terminar: "Sin terminar",
};

// Lo mismo que muestra el comprobante del pago (PagoResultadoPage)
export const TIPO_DE_PAGO: Record<string, string> = {
  VD: "Débito",
  VP: "Prepago",
  VN: "Crédito",
  VC: "Crédito en cuotas",
  SI: "Crédito, 3 cuotas sin interés",
  S2: "Crédito, 2 cuotas sin interés",
  NC: "Crédito, cuotas sin interés",
};

// 9990 -> "$9.990"
export function pesos(valor: number) {
  return valor.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

// Paso 122e: el plan Premium de una persona, según la fecha hasta la que lo tiene
export type PlanPersona = "vigente" | "vencido" | "nunca";

export function planDe(premiumUntil: string | null): PlanPersona {
  if (!premiumUntil) return "nunca";
  return new Date(premiumUntil).getTime() > Date.now() ? "vigente" : "vencido";
}