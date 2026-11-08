// Paso A1: lo que la API devuelve sobre la sesión, con los mismos nombres que usa la API.

export interface Usuario {
  id: string;
  email: string;
  full_name: string;
  role_id: number;
  role_name: string | null;
  phone: string | null;
  two_fa_enabled: boolean;
  two_fa_required: boolean; // true = su rol la exige (el administrador)
  premium_until: string | null; // hasta cuándo tiene el plan Premium
  acceso_completo: boolean; // true = Premium vigente, analista o administrador
}

// Respuesta de POST /auth/login. Si la cuenta tiene verificación en dos pasos y falta el código,
// llega sin token y con requires_2fa en true.
export interface Token {
  access_token: string | null;
  token_type: string;
  requires_2fa: boolean;
}

export const ROL_INVERSIONISTA = 1;
export const ROL_ANALISTA = 2;
export const ROL_ADMIN = 3;
