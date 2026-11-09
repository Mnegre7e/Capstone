import { ToastController } from '@ionic/angular/lazy';

// Paso A20: "tirar la pantalla hacia abajo para actualizar", igual en Remates, el detalle de un remate y Alertas.
// El círculo de arriba se cierra SIEMPRE (aunque algo falle): cuando llegan los datos o, como mucho, a los
// 10 segundos (si la API tarda más, la pantalla se actualiza sola cuando lleguen).
const SEGUNDOS_PARA_RECARGAR = 10;

/** Pide los datos de nuevo y cierra el círculo. Devuelve true si los datos alcanzaron a llegar. */
export async function recargarConCirculo(evento: Event, recargar: () => Promise<unknown>): Promise<boolean> {
  let termino = false;
  try {
    await Promise.race([
      recargar().then(() => {
        termino = true;
      }),
      new Promise((listo) => setTimeout(listo, SEGUNDOS_PARA_RECARGAR * 1000)),
    ]);
  } finally {
    await (evento as CustomEvent<{ complete: () => Promise<void> | void }>).detail.complete();
  }
  return termino;
}

/** Un aviso corto abajo, para que se note que sí se actualizó. */
export async function avisoCorto(avisos: ToastController, mensaje: string): Promise<void> {
  const aviso = await avisos.create({ message: mensaje, duration: 2500, position: 'bottom' });
  await aviso.present();
}

export const TEXTO_SIGUE_CARGANDO = 'Se sigue actualizando: la pantalla cambia sola cuando lleguen los datos.';
