// Paso 122b: datos del plan Premium que muestran la web (aviso, catálogo y página del plan).
// El cobro lo hará la API con Webpay (paso 122d), con este mismo precio.

export const PRECIO_PREMIUM = 9990; // pesos (paso 122b2: antes 4.990)
export const DIAS_PREMIUM = 30;

// "$9.990"
export const PRECIO_PREMIUM_TEXTO = PRECIO_PREMIUM.toLocaleString("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

// Lo que incluye el plan, en el orden en que se muestra
export const BENEFICIOS_PREMIUM = [
  "El semáforo de riesgo de cada remate, con su puntaje y por qué lo tiene",
  "El precio del remate frente al precio típico de su comuna",
  "Los datos del remate: tribunal, garantía, condiciones y anuncio",
  "Las fotos y el detalle completo de cada propiedad",
    "El mapa de los remates, con el color de su semáforo", // paso 124b
  "Guardar favoritos y recibir alertas de remates nuevos",
];