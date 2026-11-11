// Paso A22: puente de correo de HouseGreen.
// Render (plan gratis) no deja que la API envíe correos con Gmail directo. Este script vive en el Gmail del
// proyecto (housegreen.capstone@gmail.com) y envía los correos que la API le pide por HTTPS.
//
// Cómo se instala (una sola vez, ver GUIA-RENDER.md):
//   1. https://script.google.com con el Gmail del proyecto > Nuevo proyecto > pegar este archivo completo.
//   2. Cambiar CLAVE (abajo) por una clave larga inventada. NO la subas a GitHub: aquí queda el texto de ejemplo.
//   3. Ejecutar la función "probar" una vez y aceptar los permisos (llega un correo de prueba al mismo Gmail).
//   4. Implementar > Nueva implementación > Aplicación web. Ejecutar como: Yo. Quién tiene acceso: Cualquier persona.
//   5. Copiar la URL que termina en /exec: va en Render como CORREO_PUENTE_URL, y la CLAVE como CORREO_PUENTE_CLAVE.
//
// Límite de Google para cuentas Gmail gratis: 100 destinatarios al día.

const CLAVE = 'CAMBIA-ESTA-CLAVE';

// La API manda: { clave, para, asunto, texto, nombre }. Responde { ok: true } o { ok: false, error }.
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    if (CLAVE === 'CAMBIA-ESTA-CLAVE' || datos.clave !== CLAVE) {
      return responder({ ok: false, error: 'clave incorrecta' });
    }
    if (!datos.para || !datos.asunto || !datos.texto) {
      return responder({ ok: false, error: 'faltan datos del correo' });
    }
    MailApp.sendEmail({
      to: String(datos.para),
      subject: String(datos.asunto),
      body: String(datos.texto),
      name: String(datos.nombre || 'HouseGreen'),
    });
    return responder({ ok: true });
  } catch (error) {
    return responder({ ok: false, error: String(error) });
  }
}

// Abrir la URL /exec en el navegador muestra esto: sirve para saber que el puente está publicado.
function doGet() {
  return responder({ ok: true, servicio: 'Puente de correo de HouseGreen' });
}

function responder(datos) {
  return ContentService.createTextOutput(JSON.stringify(datos)).setMimeType(ContentService.MimeType.JSON);
}

// Ejecútala una vez desde el editor: pide los permisos y envía un correo de prueba al mismo Gmail.
function probar() {
  const yo = Session.getActiveUser().getEmail();
  MailApp.sendEmail(yo, 'Prueba del puente de correo de HouseGreen', 'Si te llegó este correo, el puente funciona.');
  Logger.log('Correo de prueba enviado a ' + yo + '. Quedan ' + MailApp.getRemainingDailyQuota() + ' envíos hoy.');
}
