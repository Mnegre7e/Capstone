// Paso A5: las mismas reglas de contraseña que la web (utils/contrasena.ts) y la API (app/auth/security.py).
// La app las revisa antes de enviar para avisar de inmediato; la API las vuelve a revisar igual.
// Si el equipo cambia las reglas, hay que cambiarlas en los tres lugares.
const LARGO_MINIMO = 8;
const LARGO_MAXIMO = 64;

export const REGLA_CONTRASENA = `Entre ${LARGO_MINIMO} y ${LARGO_MAXIMO} caracteres, con al menos una letra y un número.`;

/** El motivo por el que la contraseña no sirve, o null si cumple las reglas. */
export function problemaDeContrasena(clave: string): string | null {
  if (clave.length < LARGO_MINIMO) return `La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.`;
  if (clave.length > LARGO_MAXIMO) return `La contraseña puede tener como máximo ${LARGO_MAXIMO} caracteres.`;
  if (!/\p{L}/u.test(clave)) return 'La contraseña debe tener al menos una letra.';
  if (!/\d/.test(clave)) return 'La contraseña debe tener al menos un número.';
  return null;
}

/** El código de 6 dígitos se escribe solo con números (y un espacio, como lo muestran la aplicación y el correo). */
export function soloDigitosYEspacio(texto: string): string {
  return texto.replace(/[^\d ]/g, '');
}
