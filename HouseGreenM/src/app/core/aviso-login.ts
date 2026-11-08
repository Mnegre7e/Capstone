// Paso A5: un aviso corto que una pantalla deja para mostrarlo en el inicio de sesión
// (por ejemplo, "Tu contraseña se cambió"). Igual que en la web: dura solo mientras la app está abierta.
const CLAVE = 'housegreen_aviso_login';

export function dejarAvisoParaElLogin(texto: string): void {
  try {
    sessionStorage.setItem(CLAVE, texto);
  } catch {
    // si no se puede guardar, simplemente no se muestra el aviso
  }
}

/** Lee el aviso y lo borra: se muestra una sola vez. */
export function tomarAvisoDelLogin(): string {
  try {
    const texto = sessionStorage.getItem(CLAVE) ?? '';
    sessionStorage.removeItem(CLAVE);
    return texto;
  } catch {
    return '';
  }
}
