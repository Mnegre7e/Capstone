// Paso 122c: a dónde volver después de iniciar sesión o crear la cuenta.
// Por ejemplo, /registro?volver=/premium deja a la persona en la página del plan apenas crea su cuenta.
// Solo se aceptan direcciones de HouseGreen (que empiezan con una sola "/"): así nadie puede usar
// el enlace para mandar a alguien a otro sitio después de iniciar sesión.
export function rutaDeVuelta(search: string): string | null {
  const volver = new URLSearchParams(search).get("volver");
  if (volver && volver.startsWith("/") && !volver.startsWith("//") && !volver.startsWith("/\\")) {
    return volver;
  }
  return null;
}

// "/registro" + "/premium" -> "/registro?volver=%2Fpremium" (sin destino, la dirección queda igual)
export function conVuelta(ruta: string, volver: string | null): string {
  return volver ? `${ruta}?volver=${encodeURIComponent(volver)}` : ruta;
}