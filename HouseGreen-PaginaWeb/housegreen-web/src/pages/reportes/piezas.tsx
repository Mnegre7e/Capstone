import { useState } from "react";
import type { ReactNode } from "react";
import {
  MEDIDAS,
  MESES,
  NIVELES,
  nombreDeLaFecha,
  numero,
  plural,
  porcentaje,
  topeRedondo,
  type Medida,
  type PuntoDeLaSerie,
} from "./formato";

// Paso 115: piezas que se repiten en las pantallas de Reportes

// ---------- Cifras grandes (4 por fila en PC, 2 en celular) ----------
export function Cifras({ cifras }: { cifras: { titulo: string; valor: string; nota?: string }[] }) {
  return (
    <div className="rep-cifras">
      {cifras.map((cifra) => (
        <div key={cifra.titulo} className="rep-cifra">
          <p className="rep-cifra-titulo">{cifra.titulo}</p>
          <p className="rep-cifra-valor">{cifra.valor}</p>
          {cifra.nota && <p className="rep-cifra-nota">{cifra.nota}</p>}
        </div>
      ))}
    </div>
  );
}

// ---------- Tarjeta con título ----------
export function Tarjeta({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div className="rep-tarjeta">
      <div className="rep-tarjeta-cabecera">
        <h2>{titulo}</h2>
        {extra}
      </div>
      {children}
    </div>
  );
}

// ---------- Barras horizontales: una fila por cosa (comuna, tipo, paso del embudo...) ----------
// El largo de cada barra es relativo a la más grande; el número va siempre escrito al lado.
export function Barras({
  filas,
  total,
  vacio,
}: {
  filas: { nombre: string; cantidad: number; nota?: string }[];
  total?: number; // si viene, se muestra también el porcentaje
  vacio: string;
}) {
  const maximo = Math.max(...filas.map((f) => f.cantidad), 0);
  if (filas.length === 0 || maximo === 0) return <p className="rep-vacio">{vacio}</p>;
  return (
    <ul className="rep-barras">
      {filas.map((fila) => (
        <li key={fila.nombre}>
          <span className="rep-barras-nombre">
            {fila.nombre}
            {fila.nota && <span className="rep-gris"> · {fila.nota}</span>}
          </span>
          <span className="rep-barras-pista" aria-hidden="true">
            {/* Con 0 no se dibuja relleno: la pista queda vacía */}
            {fila.cantidad > 0 && (
              <span className="rep-barras-relleno" style={{ width: `${(fila.cantidad / maximo) * 100}%` }} />
            )}
          </span>
          <span className="rep-barras-valor">
            {numero(fila.cantidad)}
            {total !== undefined && <span className="rep-gris"> {porcentaje(fila.cantidad, total)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------- Barra del semáforo con su leyenda ----------
export function BarraSemaforo({ semaforo }: { semaforo: Record<string, number> }) {
  const niveles = NIVELES.map((nivel) => ({ ...nivel, cantidad: semaforo[nivel.valor] ?? 0 }));
  const total = niveles.reduce((suma, nivel) => suma + nivel.cantidad, 0);
  if (total === 0) return <p className="rep-vacio">No hay remates vigentes.</p>;
  return (
    <>
      <div
        className="rep-barra-semaforo"
        role="img"
        aria-label={niveles.map((nivel) => `${nivel.nombre}: ${nivel.cantidad}`).join(", ")}
      >
        {niveles
          .filter((nivel) => nivel.cantidad > 0)
          .map((nivel) => (
            <span
              key={nivel.valor}
              className={`rep-parte is-${nivel.valor}`}
              style={{ flexGrow: nivel.cantidad }}
              title={`${nivel.nombre}: ${numero(nivel.cantidad)} (${porcentaje(nivel.cantidad, total)})`}
            />
          ))}
      </div>
      {/* La leyenda lleva el nombre y la cantidad: el color nunca va solo */}
      <ul className="rep-leyenda">
        {niveles.map((nivel) => (
          <li key={nivel.valor}>
            <span className={`rep-leyenda-color is-${nivel.valor}`} aria-hidden="true" />
            <span className="rep-gris">{nivel.nombre}</span>
            <strong>{numero(nivel.cantidad)}</strong>
            <span className="rep-gris">{porcentaje(nivel.cantidad, total)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------- Gráfico de columnas: cuántos hubo cada día (o cada mes) de una medida ----------
export function Grafico({ serie, medida, porMes }: { serie: PuntoDeLaSerie[]; medida: Medida; porMes: boolean }) {
  const [activa, setActiva] = useState<number | null>(null);
  const info = MEDIDAS.find((m) => m.valor === medida)!;
  const valores = serie.map((punto) => punto[medida]);
  const total = valores.reduce((suma, valor) => suma + valor, 0);
  const tope = topeRedondo(Math.max(...valores, 0));
  // Con muchas barras no caben todas las fechas: se muestra una de cada "salto" (y siempre la última).
  // En celular quedan solo la primera, la del medio y la última (las "clave").
  const salto = serie.length <= 12 ? 1 : Math.ceil(serie.length / 6);
  const ultima = serie.length - 1;
  const medio = Math.round(ultima / 2 / salto) * salto;
  const esClave = (i: number) => i === 0 || i === ultima || i === medio;

  if (total === 0) {
    return <p className="rep-vacio">No hubo {info.plural} en este período.</p>;
  }

  return (
    <div className="rep-grafico">
      <div className="rep-grafico-zona">
        {/* Líneas de fondo y números del eje: 0, la mitad y el tope */}
        {[tope, tope / 2, 0].map((valor) => (
          <div key={valor} className="rep-guia" style={{ bottom: `${(valor / tope) * 100}%` }}>
            <span>{Number.isInteger(valor) ? numero(valor) : ""}</span>
          </div>
        ))}

        <div className="rep-columnas" onMouseLeave={() => setActiva(null)}>
          {serie.map((punto, i) => {
            const valor = punto[medida];
            const fecha = nombreDeLaFecha(punto.fecha, true);
            return (
              <div
                key={punto.fecha}
                className={`rep-columna ${activa === i ? "is-activa" : ""}`}
                tabIndex={0}
                aria-label={`${fecha}: ${plural(valor, info.singular, info.plural)}`}
                onMouseEnter={() => setActiva(i)}
                onFocus={() => setActiva(i)}
                onBlur={() => setActiva(null)}
              >
                {valor > 0 && <span className="rep-barra" style={{ height: `${(valor / tope) * 100}%` }} />}
                {activa === i && (
                  <span className={`rep-globo ${i < serie.length / 2 ? "is-izquierda" : "is-derecha"}`} role="tooltip">
                    <strong>{plural(valor, info.singular, info.plural)}</strong>
                    <span>{fecha}</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fechas debajo del gráfico */}
      <div className="rep-fechas" aria-hidden="true">
        {serie.map((punto, i) => (
          <span key={punto.fecha} className={esClave(i) ? "" : "is-extra"}>
            {i % salto === 0 || i === ultima
              ? porMes
                ? MESES[Number(punto.fecha.split("-")[1]) - 1]
                : nombreDeLaFecha(punto.fecha)
              : ""}
          </span>
        ))}
      </div>

      {/* Los mismos datos en una tabla (para leerlos exactos o con lector de pantalla) */}
      <details className="rep-tabla">
        <summary>Ver los datos en una tabla</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{porMes ? "Mes" : "Día"}</th>
              {MEDIDAS.map((m) => (
                <th key={m.valor} scope="col">
                  {m.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {serie.map((punto) => (
              <tr key={punto.fecha}>
                <th scope="row">{nombreDeLaFecha(punto.fecha, true)}</th>
                {MEDIDAS.map((m) => (
                  <td key={m.valor}>{numero(punto[m.valor])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

// ---------- Botones para elegir la medida del gráfico ----------
export function ElegirMedida({
  opciones,
  medida,
  onCambiar,
}: {
  opciones: Medida[];
  medida: Medida;
  onCambiar: (medida: Medida) => void;
}) {
  return (
    <div className="rep-medidas" role="group" aria-label="Qué mostrar en el gráfico">
      {MEDIDAS.filter((m) => opciones.includes(m.valor)).map((m) => (
        <button
          key={m.valor}
          type="button"
          className={`rep-medida ${medida === m.valor ? "is-elegida" : ""}`}
          aria-pressed={medida === m.valor}
          onClick={() => onCambiar(m.valor)}
        >
          {m.nombre}
        </button>
      ))}
    </div>
  );
}