// Paso 124c: colores de las comunas según cuántos remates tienen (un solo tono, de claro a oscuro).
// Es azul para no confundirlo con los colores del semáforo.
// Paso 125e: estaban en MapaRemates.tsx; se movieron aquí porque un archivo con componentes
// debe exportar solo componentes (regla react-refresh de ESLint). Los usan MapaRemates y MapaPage (la leyenda).
export const ESCALA_COMUNAS: { desde: number; texto: string; color: string }[] = [
  { desde: 1, texto: "1 a 4", color: "#dbe9f2" },
  { desde: 5, texto: "5 a 9", color: "#a9cbe1" },
  { desde: 10, texto: "10 a 19", color: "#6fa6cb" },
  { desde: 20, texto: "20 a 39", color: "#3b7cb0" },
  { desde: 40, texto: "40 o más", color: "#1d4f7e" },
];
const SIN_REMATES = "#eef1f0";

export function colorDeComuna(cantidad: number) {
  let color = SIN_REMATES;
  for (const paso of ESCALA_COMUNAS) if (cantidad >= paso.desde) color = paso.color;
  return color;
}