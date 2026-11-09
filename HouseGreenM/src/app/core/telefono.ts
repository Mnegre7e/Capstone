// Paso A19: el teléfono se escribe con el formato chileno y sin dígitos de más: "+56 9 1234 5678"
// (el mismo de la web: utils/telefono.ts). Cualquier número chileno tiene 9 dígitos después del +56.
const DIGITOS_DEL_NUMERO = 9;

/** Deja el texto como "+56 9 1234 5678": solo números, sin el 56 repetido y como máximo 9 dígitos. */
export function formatearTelefono(texto: string): string {
  // Mientras se escribe el código del país ("+", "+5", "+56"), se deja tal cual
  const compacto = texto.replace(/\s/g, '');
  if (/^\+5?6?$/.test(compacto)) {
    return compacto;
  }
  let digitos = texto.replace(/\D/g, '');
  // El +56 ya está escrito (o se pegó un número con el 56 adelante): no cuenta como parte del número
  if (texto.trim().startsWith('+56') || (digitos.startsWith('56') && digitos.length > DIGITOS_DEL_NUMERO)) {
    digitos = digitos.slice(2);
  }
  digitos = digitos.slice(0, DIGITOS_DEL_NUMERO);
  if (digitos === '') {
    return '';
  }
  const partes = [digitos.slice(0, 1), digitos.slice(1, 5), digitos.slice(5)].filter((parte) => parte !== '');
  return `+56 ${partes.join(' ')}`;
}

/** El largo máximo del cuadro: "+56 9 1234 5678". */
export const LARGO_DEL_TELEFONO = 15;
