import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

// Paso 123d: buscador de Reportes. Mientras se escribe muestra los remates que calzan
// (y las personas, solo para el administrador); al elegir uno se abre su ficha con el período elegido.

interface Resultados {
  remates: { id: string; title: string; comuna: string | null; codigo: string | null; estado: string }[];
  personas: { id: string; full_name: string; email: string; estado: string }[] | null;
}

interface Opcion {
  clave: string;
  grupo: "Remates" | "Personas";
  titulo: string;
  detalle: string;
  ruta: string;
}

const ESPERA_MS = 300; // se busca cuando se deja de escribir por un momento

export function Buscador({ base, conPersonas }: { base: string; conPersonas: boolean }) {
  const navigate = useNavigate();
  const idDeLaLista = useId();
  const campo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<Resultados | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(-1); // -1 = ninguna marcada (Enter elige la primera)

  const limpio = texto.trim();

  // Se pide a la API cuando hay al menos 2 letras y se dejó de escribir
  useEffect(() => {
    if (limpio.length < 2) return;
    let vigente = true;
    const espera = setTimeout(() => {
      api
        .get(`/reportes/buscar?q=${encodeURIComponent(limpio)}`)
        .then((datos: Resultados) => {
          if (vigente) {
            setResultados(datos);
            setError(null);
            setActiva(-1);
          }
        })
        .catch((err) => vigente && setError(err instanceof Error ? err.message : "Error desconocido"))
        .finally(() => vigente && setBuscando(false));
    }, ESPERA_MS);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [limpio]);

  function cambiarTexto(nuevo: string) {
    setTexto(nuevo);
    setAbierto(true);
    if (nuevo.trim().length < 2) {
      setResultados(null);
      setBuscando(false);
    } else {
      setBuscando(true);
    }
  }

  // Las opciones en el orden en que se muestran: primero los remates, después las personas
  const opciones: Opcion[] = resultados
    ? [
        ...resultados.remates.map((r) => ({
          clave: `r-${r.id}`,
          grupo: "Remates" as const,
          titulo: r.title,
          detalle: [r.comuna, r.codigo && `código ${r.codigo}`, r.estado].filter(Boolean).join(" · "),
          ruta: `${base}/remate/${r.id}`,
        })),
        ...(resultados.personas ?? []).map((p) => ({
          clave: `p-${p.id}`,
          grupo: "Personas" as const,
          titulo: p.full_name,
          detalle: p.estado === "Activa" ? p.email : `${p.email} · ${p.estado}`,
          ruta: `${base}/persona/${p.id}`,
        })),
      ]
    : [];

  function elegir(opcion: Opcion) {
    navigate(opcion.ruta);
    setTexto("");
    setResultados(null);
    setAbierto(false);
    campo.current?.blur();
  }

  function teclas(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Escape") {
      setAbierto(false);
      return;
    }
    if (opciones.length === 0) return;
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAbierto(true);
      setActiva((i) => (i + 1) % opciones.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setActiva((i) => (i <= 0 ? opciones.length - 1 : i - 1));
    } else if (evento.key === "Enter" && abierto) {
      evento.preventDefault();
      elegir(opciones[activa >= 0 && activa < opciones.length ? activa : 0]);
    }
  }

  const mostrarLista = abierto && limpio.length >= 2 && (resultados !== null || error !== null);
  const idDeLaOpcion = (i: number) => `${idDeLaLista}-${i}`;

  return (
    <div className="rep-buscador">
      <svg className="rep-buscador-icono" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        ref={campo}
        type="search"
        value={texto}
        placeholder={conPersonas ? "Buscar un remate o una persona" : "Buscar un remate"}
        aria-label={
          conPersonas
            ? "Buscar un remate (nombre, comuna, dirección o código) o una persona (nombre o correo)"
            : "Buscar un remate por nombre, comuna, dirección o código"
        }
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={mostrarLista}
        aria-controls={idDeLaLista}
        aria-activedescendant={mostrarLista && activa >= 0 && activa < opciones.length ? idDeLaOpcion(activa) : undefined}
        autoComplete="off"
        onChange={(e) => cambiarTexto(e.target.value)}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={teclas}
      />
      {buscando && <span className="rep-buscador-buscando">Buscando...</span>}

      {mostrarLista && (
        <ul className="rep-buscador-lista" id={idDeLaLista} role="listbox" aria-label="Resultados">
          {error && (
            <li className="rep-buscador-vacio" role="presentation">
              No se pudo buscar: {error}
            </li>
          )}
          {!error && opciones.length === 0 && (
            <li className="rep-buscador-vacio" role="presentation">
              No encontramos {conPersonas ? "remates ni personas" : "remates"} con «{limpio}».
            </li>
          )}
          {opciones.map((opcion, i) => (
            <li key={opcion.clave} role="presentation">
              {/* El nombre del grupo va antes de su primera opción */}
              {(i === 0 || opciones[i - 1].grupo !== opcion.grupo) && (
                <span className="rep-buscador-grupo">{opcion.grupo}</span>
              )}
              <span
                id={idDeLaOpcion(i)}
                role="option"
                aria-selected={i === activa}
                className={`rep-buscador-opcion ${i === activa ? "is-activa" : ""}`}
                // Se usa mousedown para elegir antes de que el campo pierda el foco (y se cierre la lista)
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(opcion);
                }}
                onMouseEnter={() => setActiva(i)}
              >
                <strong>{opcion.titulo}</strong>
                <span>{opcion.detalle}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}