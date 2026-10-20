// Paso 105: un aviso corto que una página deja para mostrarlo en el inicio de sesión
// (por ejemplo, "Tu cuenta fue eliminada"). Se guarda en sessionStorage: dura solo en esta pestaña.
const CLAVE = "housegreen_aviso_login";

export function dejarAvisoParaElLogin(texto: string) {
  try {
    sessionStorage.setItem(CLAVE, texto);
  } catch {
    // Si el navegador no deja guardar, simplemente no se muestra el aviso
  }
}

export function leerAvisoDelLogin(): string {
  try {
    return sessionStorage.getItem(CLAVE) ?? "";
  } catch {
    return "";
  }
}

export function borrarAvisoDelLogin() {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    // nada que hacer
  }
}