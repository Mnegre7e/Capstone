import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./ReportesPage.css";

// Paso 110: pantalla de Reportes. La usan el administrador (desde el Panel) y el analista (desde el menú).
// Los datos vienen de GET /reportes (paso 109). El analista ve solo totales, sin nombres ni correos.

type Periodo = "7d" | "30d" | "12m";

interface PublicacionReporte {
  id: string;
  title: string;
  comuna: string | null;
  vistas: number;
  personas: number;
  guardados: number;
}

interface PuntoDeLaSerie {
  fecha: string; // "2026-10-24" (por día) o "2026-10" (por mes)
  registros: number;
  publicaciones: number;
  vistas: number;
  guardados: number;
}

// Lo que responde GET /reportes
interface Reporte {
  periodo: Periodo;
  desde: string;
  hasta: string;
  agrupado_por: "dia" | "mes";
  usuarios: {
    total: number;
    activos: number;
    nuevos: number;
    por_plataforma: Record<string, number>; // web, app, sin_dato
    eliminaron_su_cuenta: number;
    suspendidas: number;
  };
  publicaciones: {
    total: number;
    nuevas: number;
    vigentes: number;
    semaforo: Record<string, number>; // verde, amarillo, rojo, sin_evaluar
  };
  alcance: { vistas: number; personas_que_vieron: number; guardados: number; quitados: number };
  mas_vista: PublicacionReporte | null;
  mas_guardada: PublicacionReporte | null;
  ranking: PublicacionReporte[];
  actividad: {
    inicios_de_sesion: Record<string, number>; // inversionista, analista, administrador
    personas_que_entraron: Record<string, number>;
    opiniones: number;
    calificacion_promedio: number | null;
    alertas_creadas: number;
    anuncios_enviados: number;
  };
  serie: PuntoDeLaSerie[];
  personas_mas_activas: { user_id: string; full_name: string; email: string; vistas: number; guardados: number }[] | null;
}

const PERIODOS: { valor: Periodo; nombre: string; texto: string }[] = [
  { valor: "7d", nombre: "7 días", texto: "los últimos 7 días" },
  { valor: "30d", nombre: "30 días", texto: "los últimos 30 días" },
  { valor: "12m", nombre: "12 meses", texto: "los últimos 12 meses" },
];

// Qué se puede ver en el gráfico
type Medida = "vistas" | "guardados" | "registros" | "publicaciones";
const MEDIDAS: { valor: Medida; nombre: string; singular: string; plural: string }[] = [
  { valor: "vistas", nombre: "Vistas", singular: "vista", plural: "vistas" },
  { valor: "guardados", nombre: "Guardados", singular: "guardado", plural: "guardados" },
  { valor: "registros", nombre: "Registros", singular: "registro", plural: "registros" },
  { valor: "publicaciones", nombre: "Publicaciones", singular: "publicación", plural: "publicaciones" },
];

// Las partes de la barra del semáforo, de menor a mayor riesgo (como en el Panel)
const NIVELES: { valor: string; nombre: string }[] = [
  { valor: "verde", nombre: "Riesgo bajo" },
  { valor: "amarillo", nombre: "Riesgo medio" },
  { valor: "rojo", nombre: "Riesgo alto" },
  { valor: "sin_evaluar", nombre: "Sin evaluar" },
];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

// 1234 -> "1.234"
function numero(valor: number) {
  return valor.toLocaleString("es-CL");
}

function plural(cantidad: number, singular: string, varios: string) {
  return `${numero(cantidad)} ${cantidad === 1 ? singular : varios}`;
}

function porcentaje(parte: number, total: number) {
  return total === 0 ? "0 %" : `${Math.round((parte / total) * 100)} %`;
}

// "2026-10-24" -> "24 oct" y "2026-10" -> "oct 2026".
// Se arma a mano: new Date("2026-10-24") se lee en UTC y en Chile mostraría el día anterior.
function nombreDeLaFecha(fecha: string, conAnio = false) {
  const [anio, mes, dia] = fecha.split("-");
  const nombreMes = MESES[Number(mes) - 1];
  if (!dia) return `${nombreMes} ${anio}`;
  return conAnio ? `${Number(dia)} ${nombreMes} ${anio}` : `${Number(dia)} ${nombreMes}`;
}

// Fecha y hora de la API ("2026-09-25T00:00:00-03:00") -> "25 sept 2026"
function fechaDelPeriodo(fechaIso: string) {
  return new Date(fechaIso).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

// El tope del eje: un número "redondo" (1, 2, 5, 10, 20, 50...) igual o mayor que el máximo
function topeRedondo(maximo: number) {
  if (maximo <= 1) return 1;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const paso of [1, 2, 5, 10]) {
    if (paso * potencia >= maximo) return paso * potencia;
  }
  return 10 * potencia;
}

// ---------- Gráfico de barras de una sola medida ----------

function Grafico({ serie, medida, porMes }: { serie: PuntoDeLaSerie[]; medida: Medida; porMes: boolean }) {
  const [activa, setActiva] = useState<number | null>(null);
  const info = MEDIDAS.find((m) => m.valor === medida)!;
  const valores = serie.map((punto) => punto[medida]);
  const total = valores.reduce((suma, valor) => suma + valor, 0);
  const tope = topeRedondo(Math.max(...valores, 0));
  // Con muchas barras no caben todas las fechas: se muestra una de cada "salto" (y siempre la última).
  // En celular quedan solo la primera, la del medio y la última (las "clave").
  const salto = serie.length <= 12 ? 1 : Math.ceil(serie.length / 6);
  const ultima = serie.length - 1;
  const medio = Math.round(ultima / 2 / salto) * salto; // una fecha del medio que también tenga nombre
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
                  <span
                    className={`rep-globo ${i < serie.length / 2 ? "is-izquierda" : "is-derecha"}`}
                    role="tooltip"
                  >
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

// ---------- La página ----------

export function ReportesPage() {
  const { esAdmin, esAnalista } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [medida, setMedida] = useState<Medida>("vistas");

  const puedeVer = esAdmin || esAnalista;

  useEffect(() => {
    if (!puedeVer) return;
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
  }, [periodo, puedeVer]);

  function cambiarPeriodo(nuevo: Periodo) {
    if (nuevo === periodo) return;
    setCargando(true); // se muestra "Actualizando..." hasta que llegue el período nuevo
    setPeriodo(nuevo);
  }

  // Un inversionista no tiene reportes: vuelve al catálogo (la API igual lo rechaza)
  if (!puedeVer) return <Navigate to="/" replace />;

  const textoPeriodo = PERIODOS.find((p) => p.valor === periodo)!.texto;
  // El admin abre la publicación con quiénes la vieron; el analista, la ficha pública
  const enlaceDe = (id: string) => (esAdmin ? `/admin/publicaciones/${id}` : `/propiedades/${id}`);

  const encabezado = (
    <>
      {esAdmin && (
        <Link to="/admin" className="rep-volver">
          ‹ Volver al Panel
        </Link>
      )}
      <h1 className="rep-titulo">Reportes</h1>
      <p className="rep-subtitulo">
        {reporte
          ? `Del ${fechaDelPeriodo(reporte.desde)} al ${fechaDelPeriodo(reporte.hasta)}.`
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
    </>
  );

  if (error && !reporte) {
    return (
      <section className={`rep ${esAdmin ? "" : "is-suelta"}`}>
        {encabezado}
        <p className="rep-error">No se pudo cargar el reporte: {error}</p>
      </section>
    );
  }

  if (!reporte) {
    return (
      <section className={`rep ${esAdmin ? "" : "is-suelta"}`}>
        {encabezado}
        <p className="rep-subtitulo">Cargando...</p>
      </section>
    );
  }

  const { usuarios, publicaciones, alcance, actividad } = reporte;
  const porMes = reporte.agrupado_por === "mes";

  const cifras = [
    {
      titulo: "Personas registradas",
      valor: usuarios.total,
      nota: `${plural(usuarios.nuevos, "nueva", "nuevas")} en ${textoPeriodo}`,
    },
    {
      titulo: "Publicaciones subidas",
      valor: publicaciones.nuevas,
      nota: `${numero(publicaciones.vigentes)} vigentes de ${numero(publicaciones.total)} en total`,
    },
    {
      titulo: "Vistas",
      valor: alcance.vistas,
      nota: `de ${plural(alcance.personas_que_vieron, "persona", "personas")}`,
    },
    {
      titulo: "Guardados",
      valor: alcance.guardados,
      nota: `${plural(alcance.quitados, "favorito quitado", "favoritos quitados")}`,
    },
  ];

  const niveles = NIVELES.map((nivel) => ({ ...nivel, cantidad: publicaciones.semaforo[nivel.valor] ?? 0 }));
  const totalSemaforo = niveles.reduce((suma, nivel) => suma + nivel.cantidad, 0);

  const favoritas = [
    { titulo: "La más vista", publicacion: reporte.mas_vista },
    { titulo: "La más guardada", publicacion: reporte.mas_guardada },
  ];

  const tiposDeCuenta = [
    { valor: "inversionista", nombre: "Inversionistas" },
    { valor: "analista", nombre: "Analistas" },
    { valor: "administrador", nombre: "Administradores" },
  ];

  return (
    <section className={`rep ${esAdmin ? "" : "is-suelta"} ${cargando ? "is-cargando" : ""}`}>
      {encabezado}
      {error && <p className="rep-error">No se pudo actualizar: {error}</p>}

      {/* Las cuatro cifras principales */}
      <div className="rep-cifras">
        {cifras.map((cifra) => (
          <div key={cifra.titulo} className="rep-cifra">
            <p className="rep-cifra-titulo">{cifra.titulo}</p>
            <p className="rep-cifra-valor">{numero(cifra.valor)}</p>
            <p className="rep-cifra-nota">{cifra.nota}</p>
          </div>
        ))}
      </div>

      {/* Gráfico: cuántos hubo cada día (o cada mes) */}
      <div className="rep-tarjeta">
        <div className="rep-tarjeta-cabecera">
          <h2>{porMes ? "Mes a mes" : "Día a día"}</h2>
          <div className="rep-medidas" role="group" aria-label="Qué mostrar en el gráfico">
            {MEDIDAS.map((m) => (
              <button
                key={m.valor}
                type="button"
                className={`rep-medida ${medida === m.valor ? "is-elegida" : ""}`}
                aria-pressed={medida === m.valor}
                onClick={() => setMedida(m.valor)}
              >
                {m.nombre}
              </button>
            ))}
          </div>
        </div>
        <Grafico serie={reporte.serie} medida={medida} porMes={porMes} />
      </div>

      {/* La favorita del público */}
      <div className="rep-tarjeta">
        <h2>La favorita del público</h2>
        <div className="rep-favoritas">
          {favoritas.map(({ titulo, publicacion }) => (
            <div key={titulo} className="rep-favorita">
              <p className="rep-favorita-titulo">{titulo}</p>
              {publicacion ? (
                <>
                  <Link to={enlaceDe(publicacion.id)} className="rep-favorita-nombre">
                    {publicacion.title}
                  </Link>
                  <p className="rep-favorita-datos">
                    {publicacion.comuna ?? "Sin comuna"} ·{" "}
                    {titulo === "La más vista"
                      ? `${plural(publicacion.vistas, "vista", "vistas")} de ${plural(publicacion.personas, "persona", "personas")}`
                      : `${plural(publicacion.guardados, "persona la guardó", "personas la guardaron")}`}
                  </p>
                </>
              ) : (
                <p className="rep-vacio">Todavía no hay datos en este período.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Las 10 más vistas */}
      <div className="rep-tarjeta">
        <h2>Las más vistas</h2>
        {reporte.ranking.length === 0 ? (
          <p className="rep-vacio">Nadie abrió una propiedad en este período.</p>
        ) : (
          <ol className="rep-ranking">
            {reporte.ranking.map((publicacion, i) => (
              <li key={publicacion.id}>
                <span className="rep-puesto">{i + 1}</span>
                <span className="rep-ranking-info">
                  <Link to={enlaceDe(publicacion.id)}>{publicacion.title}</Link>
                  <span className="rep-gris">{publicacion.comuna ?? "Sin comuna"}</span>
                </span>
                <span className="rep-ranking-cifras">
                  <span>
                    <strong>{numero(publicacion.vistas)}</strong> {publicacion.vistas === 1 ? "vista" : "vistas"}
                  </span>
                  <span className="rep-gris">
                    {plural(publicacion.personas, "persona", "personas")} ·{" "}
                    {plural(publicacion.guardados, "guardado", "guardados")}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
        {esAdmin && (
          <p className="rep-nota">Toca una publicación para ver quiénes la vieron y quiénes la guardaron.</p>
        )}
      </div>

      <div className="rep-dos-columnas">
        {/* Usuarios */}
        <div className="rep-tarjeta">
          <h2>Usuarios</h2>
          <ul className="rep-filas">
            <li>
              <span>Se registraron en el período</span>
              <strong>{numero(usuarios.nuevos)}</strong>
            </li>
            <li className="rep-fila-detalle">
              <span>
                Desde la web {numero(usuarios.por_plataforma.web ?? 0)} · desde la app{" "}
                {numero(usuarios.por_plataforma.app ?? 0)}
                {(usuarios.por_plataforma.sin_dato ?? 0) > 0 && ` · sin dato ${numero(usuarios.por_plataforma.sin_dato)}`}
              </span>
            </li>
            <li>
              <span>Eliminaron su cuenta en el período</span>
              <strong>{numero(usuarios.eliminaron_su_cuenta)}</strong>
            </li>
            <li>
              <span>Cuentas suspendidas hoy</span>
              <strong>{numero(usuarios.suspendidas)}</strong>
            </li>
            <li>
              <span>Pueden entrar hoy</span>
              <strong>
                {numero(usuarios.activos)} de {numero(usuarios.total)}
              </strong>
            </li>
          </ul>
        </div>

        {/* Actividad de las cuentas */}
        <div className="rep-tarjeta">
          <h2>Actividad</h2>
          <ul className="rep-filas">
            {tiposDeCuenta.map((tipo) => (
              <li key={tipo.valor}>
                <span>Inicios de sesión de {tipo.nombre.toLowerCase()}</span>
                <strong title={`${plural(actividad.personas_que_entraron[tipo.valor] ?? 0, "persona", "personas")} distintas`}>
                  {numero(actividad.inicios_de_sesion[tipo.valor] ?? 0)}
                  <span className="rep-gris">
                    {" "}
                    ({plural(actividad.personas_que_entraron[tipo.valor] ?? 0, "persona", "personas")})
                  </span>
                </strong>
              </li>
            ))}
            <li>
              <span>Opiniones recibidas</span>
              <strong>
                {numero(actividad.opiniones)}
                {actividad.calificacion_promedio !== null && (
                  <span className="rep-gris"> (promedio {actividad.calificacion_promedio.toLocaleString("es-CL")} de 5)</span>
                )}
              </strong>
            </li>
            <li>
              <span>Alertas creadas</span>
              <strong>{numero(actividad.alertas_creadas)}</strong>
            </li>
            <li>
              <span>Anuncios enviados</span>
              <strong>{numero(actividad.anuncios_enviados)}</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* Semáforo de las publicaciones vigentes (hoy) */}
      <div className="rep-tarjeta">
        <h2>Semáforo de las publicaciones vigentes</h2>
        {totalSemaforo === 0 ? (
          <p className="rep-vacio">No hay publicaciones vigentes.</p>
        ) : (
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
                    title={`${nivel.nombre}: ${numero(nivel.cantidad)} (${porcentaje(nivel.cantidad, totalSemaforo)})`}
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
                  <span className="rep-gris">{porcentaje(nivel.cantidad, totalSemaforo)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Solo el administrador: quiénes fueron los más activos */}
      {reporte.personas_mas_activas && (
        <div className="rep-tarjeta">
          <h2>Personas más activas</h2>
          {reporte.personas_mas_activas.length === 0 ? (
            <p className="rep-vacio">Nadie vio ni guardó propiedades en este período.</p>
          ) : (
            <ol className="rep-ranking">
              {reporte.personas_mas_activas.map((persona, i) => (
                <li key={persona.user_id}>
                  <span className="rep-puesto">{i + 1}</span>
                  <span className="rep-ranking-info">
                    <strong className="rep-persona">{persona.full_name}</strong>
                    <span className="rep-gris">{persona.email}</span>
                  </span>
                  <span className="rep-ranking-cifras">
                    <span>{plural(persona.vistas, "vista", "vistas")}</span>
                    <span className="rep-gris">{plural(persona.guardados, "guardado", "guardados")}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="rep-nota">Solo lo ve el administrador: el analista recibe los totales sin datos personales.</p>
        </div>
      )}
    </section>
  );
}