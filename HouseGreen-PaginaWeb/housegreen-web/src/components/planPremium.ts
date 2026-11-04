// Paso 122b: datos del plan Premium que muestran la web (aviso, catálogo y página del plan).
// El cobro lo hará la API con Webpay (paso 122d), con este mismo precio.

export const PRECIO_PREMIUM = 4990; // pesos
export const DIAS_PREMIUM = 30;

// "$4.990"
export const PRECIO_PREMIUM_TEXTO = PRECIO_PREMIUM.toLocaleString("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

// Lo que incluye el plan, en el orden en que se muestra
export const BENEFICIOS_PREMIUM = [
  "El detalle completo de cada remate",
  "El puntaje del semáforo y por qué lo tiene",
  "El precio del remate frente al precio típico de su comuna",
  "Los datos del remate: tribunal, garantía, condiciones y anuncio",
  "Guardar favoritos y recibir alertas de remates nuevos",
];