import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api } from "../../api/client";
import {
  CADA,
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

// Paso 123d: ficha de una persona en Reportes (solo el administrador; se abre desde el buscador).

interface FichaPersona {
  periodo: Periodo;
  desde: string;
  hasta: string;
  agrupado_por: Agrupado;
  id: string;
  full_name: string;
  email: string;
  estado: string;
  registrada_el: string | null;
  plataforma: string | null;
  ultimo_inicio: string | null;
  premium_hasta: string | null;
  premium_vigente: boolean;
  pagos: number;
  pagado: number;
  inicios: number;
  vistas: number;
  remates_vistos: number;
  guardados: number;
  quitados: number;
  alertas_activas: number;
  opiniones: number;
  serie: PuntoDeLaSerie[];
  remates: { id: string; title: string; comuna: string | null; vistas: number; la_tiene_guardada: boolean }[];
}

const DESDE_DONDE: Record<string, string> = { web: "desde la página web", app: "desde la app" };

// "2026-11-07T17:43:00-03:00" -> "7 nov 2026, 17:43"
function fechaYHora(fechaIso: string) {
  return new Date(fechaIso).toLocaleString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FichaPersonaPage() {
  const { id } = useParams();
  const { base, consultaDelPeriodo } = useOutletContext<ContextoReportes>();
  const navigate = useNavigate();
  const location = useLocation();
  const [medida, setMedida] = useState<Medida>("vistas");
  const [llegada, setLlegada] = useState<{ clave: string; ficha: FichaPersona } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clave = `${id}?${consultaDelPeriodo}`;

  useEffect(() => {
    if (!id || consultaDelPeriodo === null) return;
    let vigente = true;
    api
      .get(`/reportes/personas/${id}?${consultaDelPeriodo}`)
      .then((datos: FichaPersona) => {
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
        <p className={error ? "rep-error" : "rep-subtitulo"}>{error ? `No se pudo cargar la persona: ${error}` : "Cargando..."}</p>
      </>
    );
  }

  const texto = textoDelPeriodo(ficha);
  const conPremium = ficha.premium_vigente;
  const premium = ficha.premium_hasta === null
    ? "No tiene"
    : conPremium
      ? `Hasta el ${fechaCorta(ficha.premium_hasta)}`
      : `Venció el ${fechaCorta(ficha.premium_hasta)}`;

  return (
    <div className={`rep-ficha-pagina ${llegada?.clave === clave ? "" : "is-cargando"}`}>
      {botonVolver}
      {error && <p className="rep-error">No se pudo actualizar: {error}</p>}

      <div className="rep-tarjeta rep-ficha">
        <span className="rep-ficha-que">Persona</span>
        <h2 className="rep-ficha-nombre">{ficha.full_name}</h2>
        <p className="rep-gris">{ficha.email}</p>
        <div className="rep-ficha-etiquetas">
          <span className={`rep-etiqueta ${ficha.estado === "Activa" ? "is-buena" : "is-mala"}`}>{ficha.estado}</span>
          <span className={`rep-etiqueta ${conPremium ? "is-premium" : ""}`}>{conPremium ? "Premium" : "Sin Premium"}</span>
        </div>
        <dl className="rep-ficha-datos">
          <div>
            <dt>Se registró</dt>
            <dd>
              {ficha.registrada_el ? fechaCorta(ficha.registrada_el) : "Sin dato"}
              {ficha.plataforma && DESDE_DONDE[ficha.plataforma] && <span className="rep-gris"> {DESDE_DONDE[ficha.plataforma]}</span>}
            </dd>
          </div>
          <div>
            <dt>Último inicio de sesión</dt>
            <dd>{ficha.ultimo_inicio ? fechaYHora(ficha.ultimo_inicio) : "Nunca"}</dd>
          </div>
          <div>
            <dt>Plan Premium</dt>
            <dd>{premium}</dd>
          </div>
          <div>
            <dt>Pagos aprobados</dt>
            <dd>
              {ficha.pagos === 0 ? "Ninguno" : `${plural(ficha.pagos, "pago", "pagos")} · ${pesos(ficha.pagado)}`}
            </dd>
          </div>
        </dl>
      </div>

      <Cifras
        cifras={[
          { titulo: "Inicios de sesión", valor: numero(ficha.inicios), nota: `en ${texto}` },
          { titulo: "Vistas", valor: numero(ficha.vistas), nota: `de ${plural(ficha.remates_vistos, "remate", "remates")} distintos` },
          { titulo: "Guardados", valor: numero(ficha.guardados), nota: `en ${texto} · ${plural(ficha.quitados, "quitado", "quitados")}` },
          {
            titulo: "Alertas activas",
            valor: numero(ficha.alertas_activas),
            nota: `${plural(ficha.opiniones, "opinión", "opiniones")} en ${texto}`,
          },
        ]}
      />

      <Tarjeta
        titulo={`${medida === "guardados" ? "Guardados" : "Vistas"} ${CADA[ficha.agrupado_por].por}`}
        extra={<ElegirMedida opciones={["vistas", "guardados"]} medida={medida} onCambiar={setMedida} />}
      >
        <Grafico serie={ficha.serie} medida={medida} agrupado={ficha.agrupado_por} columnas={["vistas", "guardados"]} />
      </Tarjeta>

      <Tarjeta titulo="Remates que vio o guardó">
        {ficha.remates.length === 0 ? (
          <p className="rep-vacio">No vio ni guardó remates en {texto}.</p>
        ) : (
          <ol className="rep-ranking is-sin-puesto">
            {ficha.remates.map((remate) => (
              <li key={remate.id}>
                <span className="rep-ranking-info">
                  <Link to={`${base}/remate/${remate.id}`} className="rep-persona rep-enlace-nombre">
                    {remate.title}
                  </Link>
                  <span className="rep-gris">{remate.comuna ?? "Sin comuna"}</span>
                </span>
                <span className="rep-ranking-cifras">
                  <span>{plural(remate.vistas, "vista", "vistas")}</span>
                  <span className="rep-gris">{remate.la_tiene_guardada ? "La tiene guardada" : "No la tiene guardada"}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="rep-nota">Solo lo ve el administrador: el analista ve los totales sin datos personales.</p>
      </Tarjeta>
    </div>
  );
}