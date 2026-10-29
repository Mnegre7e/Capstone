import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { PERIODOS, fechaCorta, type ContextoReportes, type Periodo, type Reporte } from "./formato";
import "./Reportes.css";

// Paso 115: marco de Reportes con cuatro pantallas: Resumen · Subastas · Usuarios · Alcance.
// - El analista lo tiene como su única sección (en /analista): solo mira y cambia el período.
// - El administrador lo abre desde su Panel (en /admin/reportes) y además ve quiénes son los más activos.
// El reporte se pide una sola vez por período y lo comparten las cuatro pantallas.

const PANTALLAS = [
  { ruta: "", texto: "Resumen" },
  { ruta: "subastas", texto: "Subastas" },
  { ruta: "usuarios", texto: "Usuarios" },
  { ruta: "alcance", texto: "Alcance" },
];

export function ReportesLayout({ base }: { base: string }) {
  const { esAdmin, esAnalista } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true; // si se cambia de período antes de que llegue la respuesta, se ignora la anterior
    api
      .get(`/reportes?periodo=${periodo}`)
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
  }, [periodo]);

  function cambiarPeriodo(nuevo: Periodo) {
    if (nuevo === periodo) return;
    setCargando(true); // se muestra "Actualizando..." hasta que llegue el período nuevo
    setPeriodo(nuevo);
  }

  const textoPeriodo = PERIODOS.find((p) => p.valor === periodo)!.texto;
  const contexto: ContextoReportes | null = reporte ? { reporte, esAdmin, textoPeriodo } : null;

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
          ? `Del ${fechaCorta(reporte.desde)} al ${fechaCorta(reporte.hasta)}.`
          : "Cómo se está usando HouseGreen."}
        {esAnalista && " Ves totales, sin datos personales."}
      </p>

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