import { Component } from '@angular/core';

// Paso A5: el marco de las pantallas de entrada (iniciar sesión, crear cuenta y recuperar la contraseña),
// igual que MarcoDeEntrada de la web: el panel verde con el semáforo y, debajo (o al lado, en pantallas
// anchas), el formulario. Los estilos están en theme/_entrada.scss.

// Los tres niveles, en el orden de un semáforo de verdad (rojo arriba)
const NIVELES = [
  { color: 'rojo', nombre: 'Riesgo alto', detalle: 'Pocos puntos a favor o un impedimento legal.' },
  { color: 'amarillo', nombre: 'Riesgo medio', detalle: 'Le falta algún dato o tiene un punto débil.' },
  { color: 'verde', nombre: 'Riesgo bajo', detalle: 'Buen precio, dominio claro y buena comuna.' },
];

// ---------- Dibujo del fondo (solo en pantallas anchas): la cordillera y una fila de edificios ----------
// Algunas ventanas van encendidas con los colores del semáforo: cada propiedad, con su riesgo.
const COLOR_DE_LA_LUZ: Record<string, string> = { verde: '#22c55e', amarillo: '#facc15', rojo: '#ef4444' };
const ALTO_DEL_DIBUJO = 300;
const EDIFICIOS: { x: number; ancho: number; alto: number; luces: Record<number, string> }[] = [
  { x: 24, ancho: 60, alto: 78, luces: { 4: 'amarillo' } },
  { x: 92, ancho: 76, alto: 122, luces: { 2: 'verde', 13: 'amarillo' } },
  { x: 178, ancho: 60, alto: 62, luces: { 3: 'rojo' } },
  { x: 250, ancho: 92, alto: 100, luces: { 6: 'verde', 17: 'verde' } },
  { x: 352, ancho: 60, alto: 142, luces: { 1: 'amarillo', 11: 'verde', 16: 'rojo' } },
  { x: 424, ancho: 76, alto: 84, luces: { 5: 'verde' } },
  { x: 512, ancho: 60, alto: 112, luces: { 7: 'amarillo' } },
  { x: 584, ancho: 92, alto: 70, luces: { 2: 'verde', 8: 'rojo' } },
  { x: 688, ancho: 76, alto: 130, luces: { 0: 'verde', 14: 'amarillo' } },
  { x: 776, ancho: 60, alto: 88, luces: { 6: 'verde' } },
  { x: 848, ancho: 92, alto: 108, luces: { 3: 'amarillo', 12: 'verde' } },
];

// Cada edificio con sus ventanas ya calculadas (columnas de 16px y filas de 18px)
const DIBUJO = EDIFICIOS.map((edificio) => {
  const arriba = ALTO_DEL_DIBUJO - edificio.alto;
  const columnas = Math.floor((edificio.ancho - 12) / 16);
  const filas = Math.floor((edificio.alto - 16) / 18);
  const ventanas = Array.from({ length: columnas * filas }, (_, numero) => ({
    x: edificio.x + 10 + (numero % columnas) * 16,
    y: arriba + 12 + Math.floor(numero / columnas) * 18,
    color: COLOR_DE_LA_LUZ[edificio.luces[numero]] ?? '#134a3b',
  }));
  return { x: edificio.x, y: arriba, ancho: edificio.ancho, alto: edificio.alto, ventanas };
});

@Component({
  selector: 'app-marco-entrada',
  templateUrl: './marco-entrada.component.html',
  standalone: false,
})
export class MarcoEntradaComponent {
  readonly NIVELES = NIVELES;
  readonly DIBUJO = DIBUJO;
}
