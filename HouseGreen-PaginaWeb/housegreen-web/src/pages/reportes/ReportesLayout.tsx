import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useProperties } from "../../context/PropertiesContext";
import { CATEGORIAS, type CategoriaTipo } from "../../components/tipoPropiedad";
import { NIVELES, PERIODOS, fechaCorta, type ContextoReportes, type Periodo, type Reporte } from "./formato";
import "./Reportes.css";

// Paso 115: marco de Reportes con cuatro pantallas: Resumen · Subastas · Usuarios · Alcance.
// - El analista lo tiene como su única sección (en /analista): solo mira y cambia el período.
// - El administrador lo abre desde su Panel (en /admin/reportes) y además ve quiénes son los más activos.
// El reporte se pide una sola vez por período y lo comparten las cuatro pantallas.
// Paso 123a: períodos Hoy · Esta semana · Este mes · Este año · Rango, y filtros de comuna, tipo y semáforo.

const PANTALLAS = [
  { ruta: "", texto: "Resumen" },
  { ruta: "subastas", texto: "Subastas" },
  { ruta: "usuarios", texto: "Usuarios" },
  { ruta: "alcance", texto: "Alcance" },
];

type Nivel = "verde" | "amarillo" | "rojo" | "sin_evaluar";

interface Filtros {
  comuna: string; // el id de la comuna, o "" = todas
  tipo: "" | CategoriaTipo;
  semaforo: "" | Nivel;
}
const SIN_FILTROS: Filtros = { comuna: "", tipo: "", semaforo: "" };

// La fecha de hoy en Chile, como la piden los campos de fecha: "2026-11-07"
function hoyEnChile() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
}

// "2026-11-07" -> "7 nov 2026" (armado a mano: new Date("2026-11-07") se leería en UTC)
function fechaDelCampo(valor: string) {
  const [anio, mes, dia] = valor.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

export function ReportesLayout({ base }: { base: string }) {
  const { esAdmin, esAnalista } = useAuth();
  const { comunasPorId } = useProperties();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  // Paso 123a: el rango que se está escribiendo y el que se pidió (se pide al tocar "Ver")
  const hoy = hoyEnChile();
  const [rango, setRango] = useState({ desde: `${hoy.slice(0, 8)}01`, hasta: hoy });
  const [rangoPedido, setRangoPedido] = useState<{ desde: string; hasta: string } | null>(null);
  const [errorDelRango, setErrorDelRango] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lo que se le pide a la API (null mientras se elige un rango que todavía no se pidió)
  const consulta = useMemo(() => {
    const parametros = new URLSearchParams({ periodo });
    if (periodo === "rango") {
      if (!rangoPedido) return null;
      parametros.set("desde", rangoPedido.desde);
      parametros.set("hasta", rangoPedido.hasta);
    }
    if (filtros.comuna) parametros.set("comuna_id", filtros.comuna);
    if (filtros.tipo) parametros.set("tipo", filtros.tipo);
    if (filtros.semaforo) parametros.set("semaforo", filtros.semaforo);
    return parametros.toString();
  }, [periodo, rangoPedido, filtros]);

  useEffect(() => {
    if (consulta === null) return;
    let vigente = true; // si se cambia algo antes de que llegue la respuesta, se ignora la anterior
    api
      .get(`/reportes?${consulta}`)
      .then((datos: Reporte) => {
        if (vigente) {
          setReporte(datos);
          setError(null);
        }
      })
      .catch((err) => vigente && setError(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [consulta]);

  function cambiarPeriodo(nuevo: Periodo) {
    if (nuevo === periodo) return;
    setPeriodo(nuevo);
    setErrorDelRango(null);
    // El rango se pide recién al tocar "Ver"; los demás se piden altiro ("Actualizando..." hasta que lleguen)
    if (nuevo === "rango") setRangoPedido(null);
    else setCargando(true);
  }

  function pedirRango() {
    if (!rango.desde || !rango.hasta) return setErrorDelRango("Elige las dos fechas.");
    if (rango.desde > rango.hasta) return setErrorDelRango("La fecha de inicio no puede ser posterior a la de término.");
    if (rango.desde > hoy) return setErrorDelRango("El rango no puede empezar en el futuro.");
    setErrorDelRango(null);
    setCargando(true);
    setRangoPedido({ ...rango });
  }

  function cambiarFiltro(cambio: Partial<Filtros>) {
    setFiltros((actuales) => ({ ...actuales, ...cambio }));
    if (periodo !== "rango" || rangoPedido) setCargando(true);
  }

  // Las comunas para el filtro, en orden alfabético
  const comunas = useMemo(
    () =>
      Object.entries(comunasPorId)
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [comunasPorId]
  );

  // El texto del período va después de "en" en las pantallas ("se registraron en este mes").
  // Sale del reporte que se está mostrando, para que siempre coincida con los números.
  const textoPeriodo = !reporte
    ? ""
    : reporte.periodo === "rango"
      ? `el período del ${fechaCorta(reporte.desde)} al ${fechaCorta(reporte.hasta)}`
      : (PERIODOS.find((p) => p.valor === reporte.periodo)?.texto ?? "el período elegido");
  const contexto: ContextoReportes | null = reporte ? { reporte, esAdmin, textoPeriodo } : null;

  // Los filtros con que se calculó el reporte que se muestra (para el aviso de "Filtrado por")
  const filtrosDelReporte = reporte
    ? [
        reporte.filtros.comuna,
        CATEGORIAS.find((c) => c.valor === reporte.filtros.tipo)?.nombre,
        NIVELES.find((n) => n.valor === reporte.filtros.semaforo)?.nombre,
      ].filter((texto): texto is string => Boolean(texto))
    : [];
  const hayFiltros = filtros.comuna !== "" || filtros.tipo !== "" || filtros.semaforo !== "";

  // El menú de las cuatro pantallas. Para el analista es su menú principal (abajo en celular);
  // para el administrador son pestañas dentro de Reportes (su menú principal es el del Panel).
  const menu = (
    <nav className={esAnalista ? "rep-menu" : "rep-secciones"} aria-label="Pantallas de Reportes">
      {PANTALLAS.map((p) => (
        <NavLink
          key={p.ruta}
          to={p.ruta ? `${base}/${p.ruta}` : base}
          end={p.ruta === ""}
          className={({ isActive }) => `rep-pantalla ${isActive ? "is-activa" : ""}`}
        >
          {p.texto}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <section className={`rep ${esAnalista ? "is-suelta" : ""}`}>
      {esAnalista ? (
        <>
          <span className="rep-chip">Analista · Solo lectura</span>
          {menu}
        </>
      ) : (
        <Link to="/admin" className="rep-volver">
          ‹ Volver al Panel
        </Link>
      )}

      <h1 className="rep-titulo">Reportes</h1>
      <p className="rep-subtitulo">
        {reporte
          ? fechaCorta(reporte.desde) === fechaCorta(reporte.hasta)
            ? `${fechaCorta(reporte.desde)}.`
            : `Del ${fechaCorta(reporte.desde)} al ${fechaCorta(reporte.hasta)}.`
          : "Cómo se está usando HouseGreen."}
        {esAnalista && " Ves totales, sin datos personales."}
      </p>

      {/* Paso 123a: el período */}
      <div className="rep-periodos" role="group" aria-label="Período del reporte">
        {PERIODOS.map((p) => (
          <button
            key={p.valor}
            type="button"
            className={`rep-periodo ${periodo === p.valor ? "is-elegido" : ""}`}
            aria-pressed={periodo === p.valor}
            onClick={() => cambiarPeriodo(p.valor)}
          >
            {p.nombre}
          </button>
        ))}
        {cargando && reporte && <span className="rep-actualizando">Actualizando...</span>}
      </div>

      {/* Paso 123a: el rango (dos fechas y "Ver") */}
      {periodo === "rango" && (
        <form
          className="rep-rango"
          onSubmit={(evento) => {
            evento.preventDefault();
            pedirRango();
          }}
        >
          <label>
            Desde
            <input
              type="date"
              value={rango.desde}
              max={hoy}
              onChange={(e) => setRango((actual) => ({ ...actual, desde: e.target.value }))}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={rango.hasta}
              max={hoy}
              onChange={(e) => setRango((actual) => ({ ...actual, hasta: e.target.value }))}
            />
          </label>
          <button type="submit" className="rep-ver">
            Ver
          </button>
          {errorDelRango ? (
            <p className="rep-rango-aviso is-error" role="alert">
              {errorDelRango}
            </p>
          ) : (
            !rangoPedido && (
              <p className="rep-rango-aviso">
                Elige las fechas y toca «Ver». Mientras tanto se muestra el reporte anterior.
              </p>
            )
          )}
          {rangoPedido && !errorDelRango && (
            <p className="rep-rango-aviso">
              Mostrando del {fechaDelCampo(rangoPedido.desde)} al {fechaDelCampo(rangoPedido.hasta)}.
            </p>
          )}
        </form>
      )}

      {/* Paso 123a: los filtros de los remates */}
      <div className="rep-filtros">
        <label>
          Comuna
          <select value={filtros.comuna} onChange={(e) => cambiarFiltro({ comuna: e.target.value })}>
            <option value="">Todas</option>
            {comunas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={filtros.tipo} onChange={(e) => cambiarFiltro({ tipo: e.target.value as "" | CategoriaTipo })}>
            <option value="">Todos</option>
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Semáforo
          <select value={filtros.semaforo} onChange={(e) => cambiarFiltro({ semaforo: e.target.value as "" | Nivel })}>
            <option value="">Todos</option>
            {NIVELES.map((n) => (
              <option key={n.valor} value={n.valor}>
                {n.nombre}
              </option>
            ))}
          </select>
        </label>
        {hayFiltros && (
          <button type="button" className="rep-quitar" onClick={() => cambiarFiltro(SIN_FILTROS)}>
            Quitar filtros
          </button>
        )}
      </div>

      {/* Qué cambia con los filtros (según el reporte que se está mostrando) */}
      {filtrosDelReporte.length > 0 && (
        <p className="rep-filtrado">
          <strong>Filtrado por: {filtrosDelReporte.join(" · ")}.</strong> Los remates, las vistas, los guardados y los
          avisos son solo de esos remates. Los datos de usuarios, inicios de sesión y opiniones no dependen de un
          remate: se muestran completos.
        </p>
      )}

      {!esAnalista && menu}

      {error && (
        <p className="rep-error">
          {reporte ? "No se pudo actualizar" : "No se pudo cargar el reporte"}: {error}
        </p>
      )}

      {!contexto && !error && <p className="rep-subtitulo">Cargando...</p>}

      {/* La pantalla elegida (Resumen, Subastas, Usuarios o Alcance) */}
      {contexto && (
        <div className={`rep-contenido ${cargando ? "is-cargando" : ""}`}>
          <Outlet context={contexto} />
        </div>
      )}
    </section>
  );
}