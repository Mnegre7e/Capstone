// Paso A15: la app en un teléfono Android (Capacitor).
//
//   npm run android       arma la app con la dirección de este computador en la red y la copia al proyecto Android
//                         (después se puede abrir en Android Studio con: npx cap open android)
//   npm run android:apk   lo mismo y además crea HouseGreen.apk, sin abrir Android Studio
//   npm run android:qr    comparte HouseGreen.apk por la red Wi-Fi y muestra un código QR para descargarla
//
// En el teléfono "localhost" es el propio teléfono: por eso la app tiene que llevar la dirección IP de este
// computador (por ejemplo http://192.168.1.20:8000). Si cambias de red Wi-Fi, vuelve a correr "npm run android:apk".
// La dirección se puede dar a mano:  npm run android:apk -- 192.168.1.20

import { spawnSync } from 'node:child_process';
import { copyFileSync, createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { homedir, networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CARPETA = join(dirname(fileURLToPath(import.meta.url)), '..'); // HouseGreenM
const ANDROID = join(CARPETA, 'android');
const APK = join(CARPETA, 'HouseGreen.apk');
const AMBIENTE = join(CARPETA, 'src', 'environments', 'environment.android.ts');
const PUERTO_API = 8000;
const PUERTO_QR = 8080;
const EN_WINDOWS = process.platform === 'win32';
const IP_VALIDA = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

// ---------- Utilidades ----------

function fallar(mensaje) {
  console.error(`\n✖ ${mensaje}\n`);
  process.exit(1);
}

function correr(comando, argumentos, opciones = {}) {
  console.log(`\n> ${comando} ${argumentos.join(' ')}`);
  const resultado = spawnSync(comando, argumentos, { cwd: CARPETA, stdio: 'inherit', shell: EN_WINDOWS, ...opciones });
  if (resultado.error) {
    fallar(`No se pudo ejecutar "${comando}": ${resultado.error.message}`);
  }
  if (resultado.status !== 0) {
    fallar(`Falló: ${comando} ${argumentos.join(' ')} (revisa el mensaje de arriba)`);
  }
}

function megas(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

// ---------- La dirección de este computador en la red ----------

function esPrivada(ip) {
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

function direccionesDeEsteComputador() {
  const lista = [];
  for (const [nombre, datos] of Object.entries(networkInterfaces())) {
    for (const dato of datos ?? []) {
      const esIPv4 = dato.family === 'IPv4' || dato.family === 4;
      if (esIPv4 && !dato.internal && esPrivada(dato.address)) {
        lista.push({ nombre, ip: dato.address });
      }
    }
  }
  // Primero el Wi-Fi del Mac (en0), después las otras tarjetas de red; al final lo demás (VPN, máquinas virtuales)
  const orden = ({ nombre }) => (nombre === 'en0' ? 0 : /^(en|eth|wlan|wl|wi-fi|ethernet)/i.test(nombre) ? 1 : 2);
  return lista.sort((x, y) => orden(x) - orden(y));
}

function elegirDireccion(ipAMano) {
  if (ipAMano) {
    const partes = IP_VALIDA.exec(ipAMano);
    if (!partes || partes.slice(1).some((parte) => Number(parte) > 255)) {
      fallar(`"${ipAMano}" no es una dirección IP válida (ejemplo: 192.168.1.20).`);
    }
    return ipAMano;
  }
  const encontradas = direccionesDeEsteComputador();
  if (encontradas.length === 0) {
    fallar(
      'No encontré la dirección de este computador en la red. ¿Está conectado al Wi-Fi?\n' +
        '  Si la sabes, dala a mano, por ejemplo:  npm run android:apk -- 192.168.1.20',
    );
  }
  const [elegida, ...otras] = encontradas;
  console.log(`Dirección de este computador en la red: ${elegida.ip} (${elegida.nombre})`);
  if (otras.length > 0) {
    console.log(`  (también tiene: ${otras.map((o) => `${o.ip} en ${o.nombre}`).join(', ')}; si es otra, dala a mano)`);
  }
  return elegida.ip;
}

/** La dirección con que se armó la app la última vez (la que tiene environment.android.ts). */
function direccionDeLaApp() {
  if (!existsSync(AMBIENTE)) {
    return null;
  }
  const encontrado = /apiUrl:\s*'https?:\/\/([^:/']+)/.exec(readFileSync(AMBIENTE, 'utf8'));
  return encontrado ? encontrado[1] : null;
}

async function revisarLaApi(ip) {
  const direccion = `http://${ip}:${PUERTO_API}`;
  try {
    const respuesta = await fetch(`${direccion}/pagos/plan`, { signal: AbortSignal.timeout(4000) });
    if (respuesta.ok) {
      console.log(`✔ La API responde en ${direccion}`);
      return;
    }
    console.log(`⚠ La API respondió ${respuesta.status} en ${direccion}`);
  } catch {
    console.log(
      `⚠ La API NO responde en ${direccion}. El teléfono la necesita encendida así (en housegreen-api):\n` +
        `    uvicorn app.main:app --reload --host 0.0.0.0 --port ${PUERTO_API}\n` +
        '  (la app se arma igual; esto solo es un aviso)',
    );
  }
}

// ---------- Armar la app ----------

function revisarRequisitos() {
  const [mayor] = process.versions.node.split('.').map(Number);
  if (mayor < 22) {
    fallar(`Capacitor 8 necesita Node 22 o más nuevo, y este computador tiene Node ${process.versions.node}.`);
  }
  if (!existsSync(join(CARPETA, 'node_modules', '@capacitor', 'android', 'package.json'))) {
    fallar('Falta @capacitor/android. Corre primero, en la carpeta HouseGreenM:  npm install');
  }
}

function escribirAmbiente(ip) {
  writeFileSync(
    AMBIENTE,
    `// Paso A15: lo escribe "npm run android" (scripts/android.mjs). No se sube a GitHub: es la dirección de
// ESTE computador en la red Wi-Fi, donde el teléfono encuentra la API. Cambia si cambias de red.
export const environment = {
  production: true,
  apiUrl: 'http://${ip}:${PUERTO_API}',
};
`,
  );
}

/** Ajustes al proyecto Android (se pueden repetir sin problema). */
function ajustarAndroid() {
  // La app es siempre clara: el tema de Android también. Si no, con el teléfono en modo oscuro
  // la franja de arriba (la hora, la batería) queda oscura y los íconos no se ven.
  const estilos = join(ANDROID, 'app', 'src', 'main', 'res', 'values', 'styles.xml');
  if (existsSync(estilos)) {
    const texto = readFileSync(estilos, 'utf8');
    const nuevo = texto.replaceAll('Theme.AppCompat.DayNight.NoActionBar', 'Theme.AppCompat.Light.NoActionBar');
    if (nuevo !== texto) {
      writeFileSync(estilos, nuevo);
    }
  }
  // Android bloquea las conexiones http (sin "s"); la API en la red local es http
  const manifiesto = join(ANDROID, 'app', 'src', 'main', 'AndroidManifest.xml');
  if (existsSync(manifiesto)) {
    const texto = readFileSync(manifiesto, 'utf8');
    if (!texto.includes('android:usesCleartextTraffic')) {
      writeFileSync(manifiesto, texto.replace('<application', '<application\n        android:usesCleartextTraffic="true"'));
    }
  }
}

function crearApk() {
  const entorno = { ...process.env };
  if (!entorno.JAVA_HOME) {
    // Android Studio trae su propio Java
    const java = [
      '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
      join(homedir(), 'Applications', 'Android Studio.app', 'Contents', 'jbr', 'Contents', 'Home'),
      'C:\\Program Files\\Android\\Android Studio\\jbr',
    ].find((ruta) => existsSync(ruta));
    if (java) {
      entorno.JAVA_HOME = java;
    }
  }
  if (!entorno.ANDROID_HOME && !entorno.ANDROID_SDK_ROOT) {
    const sdk = [
      join(homedir(), 'Library', 'Android', 'sdk'),
      join(homedir(), 'Android', 'Sdk'),
      join(homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
    ].find((ruta) => existsSync(ruta));
    if (sdk) {
      entorno.ANDROID_HOME = sdk;
    }
  }
  if (!entorno.JAVA_HOME || (!entorno.ANDROID_HOME && !entorno.ANDROID_SDK_ROOT)) {
    fallar(
      'No encontré Android Studio (su Java o su Android SDK).\n' +
        '  Instálalo desde https://developer.android.com/studio, ábrelo una vez y termina su instalación ("Standard").',
    );
  }
  console.log('\nCreando la APK. La primera vez demora varios minutos (descarga Gradle y lo que necesita Android).');
  if (EN_WINDOWS) {
    correr('gradlew.bat', ['assembleDebug'], { cwd: ANDROID, env: entorno });
  } else {
    correr('sh', ['gradlew', 'assembleDebug'], { cwd: ANDROID, env: entorno });
  }
  const creada = join(ANDROID, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!existsSync(creada)) {
    fallar(`Gradle terminó, pero no encontré la APK en ${creada}`);
  }
  copyFileSync(creada, APK);
}

async function armar(ip, conApk) {
  revisarRequisitos();
  await revisarLaApi(ip);
  escribirAmbiente(ip);
  correr('npx', ['ng', 'build', '--configuration', 'android']);
  if (!existsSync(ANDROID)) {
    correr('npx', ['cap', 'add', 'android']);
  }
  ajustarAndroid();
  correr('npx', ['cap', 'sync', 'android']);

  console.log(`\n✔ La app quedó armada para conectarse a la API en http://${ip}:${PUERTO_API}`);
  if (conApk) {
    crearApk();
    console.log(`\n✔ Se creó HouseGreen.apk (${megas(statSync(APK).size)}) en la carpeta HouseGreenM.`);
    console.log('  Para pasarla al teléfono con un código QR:  npm run android:qr');
  } else {
    console.log('  Para abrirla en Android Studio:  npx cap open android');
    console.log('  Para crear la APK sin Android Studio:  npm run android:apk');
  }
}

// ---------- Compartir la APK con un código QR ----------

function paginaDeDescarga(tamano) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HouseGreen para Android</title>
<style>
  body { margin: 0; font-family: system-ui, sans-serif; background: #f4f7f4; color: #1d2b22; }
  main { max-width: 420px; margin: 0 auto; padding: 32px 20px; }
  h1 { color: #1e6b3c; margin: 0 0 8px; font-size: 28px; }
  a.boton { display: block; margin: 24px 0; padding: 16px; border-radius: 12px; background: #1e6b3c; color: #fff;
    text-align: center; font-size: 18px; font-weight: 600; text-decoration: none; }
  ol { padding-left: 20px; line-height: 1.6; }
  p.nota { font-size: 14px; color: #55645a; }
</style>
</head>
<body>
<main>
  <h1>HouseGreen</h1>
  <p>La app para Android.</p>
  <a class="boton" href="/HouseGreen.apk" download>Descargar la app (${megas(tamano)})</a>
  <ol>
    <li>Toca <b>Descargar la app</b>. Si Chrome avisa que el archivo puede ser dañino, toca <b>Descargar de todas formas</b>.</li>
    <li>Abre <b>HouseGreen.apk</b> (en las descargas).</li>
    <li>Si el teléfono lo pide, permite <b>instalar apps de esta fuente</b> y vuelve atrás.</li>
    <li>Toca <b>Instalar</b>. Si aparece Play Protect, toca <b>Más detalles</b> y <b>Instalar de todas formas</b>.</li>
  </ol>
  <p class="nota">La app se conecta a la API de este computador: el teléfono tiene que estar en la misma red Wi-Fi.</p>
</main>
</body>
</html>`;
}

function mostrarQr(direccion) {
  try {
    const qr = createRequire(import.meta.url)('qrcode-terminal');
    qr.generate(direccion, { small: true }, (dibujo) => console.log(dibujo));
  } catch {
    console.log('(No pude dibujar el QR: corre "npm install" en HouseGreenM.)');
    console.log('Otra forma: abre esa dirección en Chrome del computador > menú ⋮ > Transmitir, guardar y compartir > Crear código QR.\n');
  }
}

function compartirConQr(ip) {
  if (!existsSync(APK)) {
    fallar('Todavía no existe HouseGreen.apk. Créala primero con:  npm run android:apk');
  }
  const deLaApp = direccionDeLaApp();
  if (deLaApp && deLaApp !== ip) {
    console.log(
      `⚠ La app se armó para la API en ${deLaApp}, pero ahora este computador está en ${ip}.\n` +
        '  Si cambiaste de red, vuelve a crearla con:  npm run android:apk',
    );
  }

  const servidor = createServer((pedido, respuesta) => {
    const ruta = (pedido.url ?? '/').split('?')[0];
    if (ruta === '/HouseGreen.apk') {
      const tamano = statSync(APK).size;
      respuesta.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': tamano,
        'Content-Disposition': 'attachment; filename="HouseGreen.apk"',
      });
      createReadStream(APK).pipe(respuesta);
      console.log(`  → Un teléfono (${String(pedido.socket.remoteAddress).replace('::ffff:', '')}) está descargando la app`);
    } else if (ruta === '/') {
      respuesta.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      respuesta.end(paginaDeDescarga(statSync(APK).size));
    } else {
      respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      respuesta.end('No existe');
    }
  });
  servidor.on('error', (error) => {
    fallar(
      error.code === 'EADDRINUSE'
        ? `El puerto ${PUERTO_QR} está ocupado. Cierra la otra ventana que comparte la app (Ctrl + C) y vuelve a intentar.`
        : `No se pudo compartir la app: ${error.message}`,
    );
  });
  servidor.listen(PUERTO_QR, '0.0.0.0', () => {
    const direccion = `http://${ip}:${PUERTO_QR}/`;
    console.log(`\nLa app se descarga en:  ${direccion}`);
    console.log('Escanea este código con la cámara del teléfono (conectado al mismo Wi-Fi que este computador):\n');
    mostrarQr(direccion);
    console.log('(o escribe esa dirección en Chrome del teléfono)');
    console.log('\nDeja esta ventana abierta mientras descargan la app. Para terminar: Ctrl + C');
  });
}

// ---------- Inicio ----------

const argumentos = process.argv.slice(2);
const desconocidos = argumentos.filter((a) => a !== '--apk' && a !== '--qr' && !IP_VALIDA.test(a));
if (desconocidos.length > 0) {
  fallar(`No entiendo: ${desconocidos.join(' ')}. Usa: npm run android, npm run android:apk o npm run android:qr`);
}
const ip = elegirDireccion(argumentos.find((a) => IP_VALIDA.test(a)));
if (argumentos.includes('--qr')) {
  compartirConQr(ip);
} else {
  await armar(ip, argumentos.includes('--apk'));
}
