import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { FotoPublicacion } from "./FotoPublicacion";
import {
  estadoPublicacion,
  nombreComuna,
  plural,
  textoZona,
  type EstadoPublicacion,
  type PublicacionAdmin,
  type Zona,
} from "./publicacion";
import "./AdminPublicacionesPage.css";

type Orden = "vistas" | "guardadas" | "comuna" | Zona;
type FiltroGuardados = "todas" | "con" | "sin";
// Paso 113: por defecto solo las vigentes, que son las que ve el inversionista en el catálogo
type FiltroEstado = EstadoPublicacion | "todas";

const OPCIONES_ORDEN: { valor: Orden; texto: string }[] = [
  { valor: "vistas", texto: "Más vistas" },
  { valor: "guardadas", texto: "Más guardadas" },
  { valor: "comuna", texto: "Comuna (A–Z)" },
  { valor: "verde", texto: "Semáforo: verdes primero" },
  { valor: "amarillo", texto: "Semáforo: amarillos primero" },
  { valor: "rojo", texto: "Semáforo: rojos primero" },
];

const OPCIONES_GUARDADOS: { valor: FiltroGuardados; texto: string }[] = [
  { valor: "todas", texto: "Todas" },
  { valor: "con", texto: "Con guardados" },
  { valor: "sin", texto: "Sin guardados" },
];

// Etiqueta de las que no están en el catálogo
const NOMBRE_DEL_ESTADO: Record<EstadoPublicacion, string> = {
  vigente: "Vigente",
  finalizada: "Ya se remató",
  retirada: "Retirada",
  quitada: "Quitada",
};

const OPCIONES_ESTADO: { valor: FiltroEstado; texto: string }[] = [
  { valor: "vigente", texto: "Vigentes" },
  { valor: "finalizada", texto: "Ya se remataron" },
  { valor: "retirada", texto: "Retiradas" },
  { valor: "quitada", texto: "Quitadas por el admin" },
  { valor: "todas", texto: "Todas" },
];

// Orden de las zonas para cada opción del semáforo; las "Sin evaluar" (null) siempre al final
const ORDEN_ZONAS: Record<Zona, (Zona | null)[]> = {
  verde: ["verde", "amarillo", "rojo", null],
  amarillo: ["amarillo", "verde", "rojo", null],
  rojo: ["rojo", "amarillo", "verde", null],
};

// Compara dos publicaciones según el orden elegido. Si empatan, va primero la más vista.
function comparar(orden: Orden, a: PublicacionAdmin, b: PublicacionAdmin) {
  const porVistas = b.vistas - a.vistas || b.guardados - a.guardados;
  if (orden === "vistas") return porVistas;
  if (orden === "guardadas") return b.guardados - a.guardados || b.vistas - a.vistas;
  if (orden === "comuna") return nombreComuna(a).localeCompare(nombreComuna(b), "es") || porVistas;
  const zonas = ORDEN_ZONAS[orden];
  return zonas.indexOf(a.result_level) - zonas.indexOf(b.result_level) || porVistas;
}

export function AdminPublicacionesPage() {
  const [publicaciones, setPublicaciones] = useState<PublicacionAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ordenar y filtrar (paso 16)
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [orden, setOrden] = useState<Orden>("vistas");
  const [comunasElegidas, setComunasElegidas] = useState<string[]>([]); // vacío = todas
  const [guardados, setGuardados] = useState<FiltroGuardados>("todas");
  const [estado, setEstado] = useState<FiltroEstado>("vigente");

  useEffect(() => {
    api
      .get("/admin/publicaciones")
      .then((datos: PublicacionAdmin[]) => setPublicaciones(datos))
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  // Comunas que aparecen en las publicaciones, sin repetir y de la A a la Z
  const comunas = [...new Set(publicaciones.map(nombreComuna))].sort((a, b) => a.localeCompare(b, "es"));

  const porEstado: Record<FiltroEstado, number> = {
    vigente: 0,
    finalizada: 0,
    retirada: 0,
    quitada: 0,
    todas: publicaciones.length,
  };

  // filter() crea una lista nueva, así sort() no desordena el estado original
  const resultado = publicaciones
    .filter((p) => estado === "todas" || estadoPublicacion(p) === estado)
    .filter((p) => comunasElegidas.length === 0 || comunasElegidas.includes(nombreComuna(p)))
    .filter((p) => guardados === "todas" || (guardados === "con" ? p.guardados > 0 : p.guardados === 0))
    .sort((a, b) => comparar(orden, a, b));

  const filtrosActivos = comunasElegidas.length + (guardados !== "todas" ? 1 : 0) + (estado !== "vigente" ? 1 : 0);
  const textoOrden = OPCIONES_ORDEN.find((o) => o.valor === orden)?.texto;

  function alternarComuna(comuna: string) {
    setComunasElegidas((actuales) =>
      actuales.includes(comuna) ? actuales.filter((c) => c !== comuna) : [...actuales, comuna]
    );
  }

  function limpiar() {
    setOrden("vistas");
    setComunasElegidas([]);
    setGuardados("todas");
    setEstado("vigente");
  }

  return (
    <section>
      <h1 className="admin-titulo">Publicaciones</h1>
      <p className="admin-subtitulo">
        {cargando
          ? "Cargando..."
          : `${plural(porEstado.vigente, "vigente", "vigentes")} en el catálogo · ${publicaciones.length} en total`}
      </p>

      {error && <p className="pub-error">No se pudieron cargar las publicaciones: {error}</p>}

      <div className="pub-barra">
        <button
          type="button"
          className="pub-boton-filtros"
          aria-expanded={panelAbierto}
          onClick={() => setPanelAbierto(!panelAbierto)}
        >
          Ordenar y filtrar{filtrosActivos > 0 && ` · ${filtrosActivos}`}
        </button>
        <span>
          Orden: <strong>{textoOrden}</strong>
        </span>
        <span className="pub-barra-total">{plural(resultado.length, "resultado", "resultados")}</span>
      </div>

      {panelAbierto && (
        <div className="pub-panel">
          <fieldset className="pub-grupo">
            <legend>Ordenar por</legend>
            {OPCIONES_ORDEN.map((o) => (
              <label key={o.valor} className="pub-opcion">
                <input
                  type="radio"
                  name="orden"
                  checked={orden === o.valor}
                  onChange={() => setOrden(o.valor)}
                />
                {o.texto}
              </label>
            ))}
          </fieldset>

          {/* Paso 113: las que ya se remataron o se retiraron quedan como registro, pero no se editan */}
          <fieldset className="pub-grupo">
            <legend>Estado del remate</legend>
            <div className="pub-chips">
              {OPCIONES_ESTADO.map((o) => {
                const activa = estado === o.valor;
                return (
                  <button
                    key={o.valor}
                    type="button"
                    className={`pub-chip ${activa ? "is-activo" : ""}`}
                    aria-pressed={activa}
                    onClick={() => setEstado(o.valor)}
                  >
                    {activa && "✓ "}
                    {o.texto} <span className="pub-chip-cuenta">{porEstado[o.valor]}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="pub-grupo">
            <legend>Comuna</legend>
            <div className="pub-chips">
              {comunas.map((c) => {
                const activa = comunasElegidas.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    className={`pub-chip ${activa ? "is-activo" : ""}`}
                    aria-pressed={activa}
                    onClick={() => alternarComuna(c)}
                  >
                    {activa && "✓ "}
                    {c}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="pub-grupo">
            <legend>Guardados</legend>
            <div className="pub-chips">
              {OPCIONES_GUARDADOS.map((o) => {
                const activa = guardados === o.valor;
                return (
                  <button
                    key={o.valor}
                    type="button"
                    className={`pub-chip ${activa ? "is-activo" : ""}`}
                    aria-pressed={activa}
                    onClick={() => setGuardados(o.valor)}
                  >
                    {activa && "✓ "}
                    {o.texto}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="pub-panel-botones">
            <button type="button" className="pub-boton-limpiar" onClick={limpiar}>
              Limpiar
            </button>
            <button type="button" className="pub-boton-ver" onClick={() => setPanelAbierto(false)}>
              Ver {plural(resultado.length, "publicación", "publicaciones")}
            </button>
          </div>
        </div>
      )}

      {resultado.length === 0 && publicaciones.length > 0 && (
        <div className="pub-vacio">
          <p>Ninguna publicación coincide con los filtros.</p>
          <button type="button" className="pub-boton-limpiar" onClick={limpiar}>
            Limpiar filtros
          </button>
        </div>
      )}

      <ul className="pub-lista">
        {resultado.map((p) => {
          const estadoDeEsta = estadoPublicacion(p);
          return (
            <li key={p.id} className="pub-item">
              <Link to={`/admin/publicaciones/${p.id}`} className="pub-tarjeta">
                <FotoPublicacion url={p.image_url} alt={p.title} />

                <div className="pub-datos">
                  <h2 className="pub-titulo">{p.title}</h2>
                  <p className="pub-comuna">
                    {nombreComuna(p)} · {p.property_type}
                  </p>
                  {/* Paso 114: la dirección, para distinguir las que tienen el mismo título */}
                  {p.address && <p className="pub-direccion">{p.address}</p>}
                  <div className="pub-cifras">
                    {estadoDeEsta !== "vigente" && (
                      <span className={`pub-estado is-${estadoDeEsta}`}>{NOMBRE_DEL_ESTADO[estadoDeEsta]}</span>
                    )}
                    <span className={`pub-zona pub-zona-${p.result_level ?? "sin"}`}>
                      <span className="pub-zona-punto" />
                      {textoZona(p)}
                    </span>
                    <span>{plural(p.vistas, "vista", "vistas")}</span>
                    <span>{plural(p.guardados, "guardado", "guardados")}</span>
                  </div>
                </div>

                <span className="pub-flecha" aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}