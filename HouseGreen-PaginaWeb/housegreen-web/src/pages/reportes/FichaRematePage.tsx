import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api } from "../../api/client";
import {
  CADA,
  NIVELES,
  fechaCorta,
  numero,
  pesos,
  plural,
  textoDelPeriodo,
  type Agrupado,
  type ContextoReportes,
  type Medida,
  type Periodo,
  type PuntoDeLaSerie,
} from "./formato";
import { Cifras, ElegirMedida, Grafico, Tarjeta } from "./piezas";

// Paso 123d: ficha de un remate en Reportes (se abre desde el buscador).
// El admin y el analista ven sus números del período; quiénes lo vieron o guardaron, solo el admin.

interface FichaRemate {
  periodo: Periodo;
  desde: string;
  hasta: string;
  agrupado_por: Agrupado;
  id: string;
  title: string;
  comuna: string | null;
  tipo: string;
  direccion: string | null;
  codigo: string | null;
  precio_minimo: number | null;
  fecha_del_remate: string | null;
  estado: string;
  semaforo: string;
  vistas: number;
  personas: number;
  guardados: number;
  quitados: number;
  la_tienen_guardada: number;
  avisos: number;
  serie: PuntoDeLaSerie[];
  quienes: { user_id: string; full_name: string; email: string; vistas: number; la_tiene_guardada: boolean }[] | null;
}

export function FichaRematePage() {
  const { id } = useParams();
  const { esAdmin, base, consultaDelPeriodo } = useOutletContext<ContextoReportes>();
  const navigate = useNavigate();
  const location = useLocation();
  const [medida, setMedida] = useState<Medida>("vistas");
  // La ficha que llegó, con la consulta con que se pidió (para saber si está al día)
  const [llegada, setLlegada] = useState<{ clave: string; ficha: FichaRemate } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clave = `${id}?${consultaDelPeriodo}`;

  useEffect(() => {
    if (!id || consultaDelPeriodo === null) return;
    let vigente = true;
    api
      .get(`/reportes/remates/${id}?${consultaDelPeriodo}`)
      .then((datos: FichaRemate) => {
        if (vigente) {
          setLlegada({ clave: `${id}?${consultaDelPeriodo}`, ficha: datos });
          setError(null);
        }
      })
      .catch((err) => vigente && setError(err instanceof Error ? err.message : "Error desconocido"));
    return () => {
      vigente = false;
    };
  }, [id, consultaDelPeriodo]);

  // Volver a donde estaba (o al Resumen, si la ficha se abrió directo)
  const volver = () => (location.key !== "default" ? navigate(-1) : navigate(base));
  const botonVolver = (
    <button type="button" className="rep-volver rep-volver-boton" onClick={volver}>
      ‹ Volver
    </button>
  );

  const ficha = llegada && llegada.ficha.id === id ? llegada.ficha : null;
  if (!ficha) {
    return (
      <>
        {botonVolver}
        <p className={error ? "rep-error" : "rep-subtitulo"}>{error ? `No se pudo cargar el remate: ${error}` : "Cargando..."}</p>
      </>
    );
  }

  const texto = textoDelPeriodo(ficha);
  const nivel = NIVELES.find((n) => n.valor === ficha.semaforo);

  return (
    <div className={`rep-ficha-pagina ${llegada?.clave === clave ? "" : "is-cargando"}`}>
      {botonVolver}
      {error && <p className="rep-error">No se pudo actualizar: {error}</p>}

      <div className="rep-tarjeta rep-ficha">
        <span className="rep-ficha-que">Remate</span>
        <h2 className="rep-ficha-nombre">{ficha.title}</h2>
        <p className="rep-gris">{[ficha.comuna, ficha.tipo, ficha.codigo && `código ${ficha.codigo}`].filter(Boolean).join(" · ")}</p>
        <div className="rep-ficha-etiquetas">
          <span className={`rep-etiqueta ${ficha.estado === "Vigente" ? "is-buena" : ""}`}>{ficha.estado}</span>
          <span className="rep-etiqueta">
            <span className={`rep-leyenda-color is-${ficha.semaforo}`} aria-hidden="true" />
            {nivel?.nombre ?? "Sin evaluar"}
          </span>
        </div>
        <dl className="rep-ficha-datos">
          <div>
            <dt>Precio inicial</dt>
            <dd>{ficha.precio_minimo === null ? "Sin dato" : pesos(ficha.precio_minimo)}</dd>
          </div>
          <div>
            <dt>Fecha y hora de la subasta</dt>
            <dd>{ficha.fecha_del_remate ? fechaCorta(ficha.fecha_del_remate) : "Sin fecha"}</dd>
          </div>
          <div>
            <dt>Dirección</dt>
            <dd>{ficha.direccion || "Sin dirección"}</dd>
          </div>
        </dl>
      </div>

      <Cifras
        cifras={[
          { titulo: "Vistas", valor: numero(ficha.vistas), nota: `de ${plural(ficha.personas, "persona", "personas")} en ${texto}` },
          { titulo: "Guardados", valor: numero(ficha.guardados), nota: `en ${texto} · ${plural(ficha.quitados, "quitado", "quitados")}` },
          { titulo: "La tienen guardada", valor: numero(ficha.la_tienen_guardada), nota: "hoy" },
          { titulo: "Avisos enviados", valor: numero(ficha.avisos), nota: `por sus alertas, en ${texto}` },
        ]}
      />

      <Tarjeta
        titulo={`${medida === "guardados" ? "Guardados" : "Vistas"} ${CADA[ficha.agrupado_por].por}`}
        extra={<ElegirMedida opciones={["vistas", "guardados"]} medida={medida} onCambiar={setMedida} />}
      >
        <Grafico serie={ficha.serie} medida={medida} agrupado={ficha.agrupado_por} columnas={["vistas", "guardados"]} />
      </Tarjeta>

      {/* Solo el administrador ve quiénes son */}
      {esAdmin && ficha.quienes && (
        <Tarjeta titulo="Quiénes la vieron o la guardaron">
          {ficha.quienes.length === 0 ? (
            <p className="rep-vacio">Nadie la vio ni la guardó en {texto}.</p>
          ) : (
            <ol className="rep-ranking is-sin-puesto">
              {ficha.quienes.map((persona) => (
                <li key={persona.user_id}>
                  <span className="rep-ranking-info">
                    <Link to={`${base}/persona/${persona.user_id}`} className="rep-persona rep-enlace-nombre">
                      {persona.full_name}
                    </Link>
                    <span className="rep-gris">{persona.email}</span>
                  </span>
                  <span className="rep-ranking-cifras">
                    <span>{plural(persona.vistas, "vista", "vistas")}</span>
                    <span className="rep-gris">{persona.la_tiene_guardada ? "La tiene guardada" : "No la tiene guardada"}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="rep-nota">
            Solo lo ve el administrador.{" "}
            <Link to={`/admin/publicaciones/${ficha.id}`} className="rep-enlace">
              Ver la publicación ›
            </Link>
          </p>
        </Tarjeta>
      )}
    </div>
  );
}