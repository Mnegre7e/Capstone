import type { CapacitorConfig } from '@capacitor/cli';
import { existsSync, readFileSync } from 'node:fs';

// Paso A15: la app instalada en un teléfono Android.
// "npm run android" (scripts/android.mjs) escribe en src/environments/environment.android.ts la dirección
// de este computador en la red (por ejemplo http://192.168.1.20:8000), donde el teléfono encuentra la API.

/** El computador con la API, sacado de environment.android.ts (vacío si todavía no se corre "npm run android"). */
function computadorConLaApi(): string[] {
  const archivo = 'src/environments/environment.android.ts';
  if (!existsSync(archivo)) {
    return [];
  }
  const encontrado = /apiUrl:\s*'https?:\/\/([^:/']+)/.exec(readFileSync(archivo, 'utf8'));
  return encontrado ? [encontrado[1]] : [];
}

const config: CapacitorConfig = {
  appId: 'cl.housegreen.app',
  appName: 'HouseGreen',
  webDir: 'www',
  server: {
    // La app se abre en http://localhost dentro del teléfono (así puede hablar con la API por http en la red local)
    androidScheme: 'http',
    cleartext: true,
    // Lo que se abre DENTRO de la app (lo demás, como Google Maps o la fuente de un remate, se abre en Chrome):
    // las páginas de Webpay y la API, que es donde Transbank devuelve a la persona después de pagar
    allowNavigation: ['*.transbank.cl', ...computadorConLaApi()],
  },
  plugins: {
    SystemBars: {
      // La app es siempre clara (fondo blanco): íconos oscuros en la barra de arriba del teléfono
      style: 'LIGHT',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
