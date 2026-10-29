import { Link, useOutletContext } from "react-router-dom";
import { NOMBRE_DEL_AVISO, fechaCorta, numero, plural, porcentaje, type ContextoReportes } from "./formato";
import { Barras, Cifras, Grafico, Tarjeta } from "./piezas";

// Paso 115: Alcance. Cuánta gente ve los remates, cuáles interesan más y si se leen los avisos y anuncios.
export function AlcancePage() {
  const { reporte, esAdmin, textoPeriodo } = useOutletContext<ContextoReportes>();
  const { alcance, avisos, embudo } = reporte;
  const anuncio = reporte.ultimo_anuncio;
  // El admin abre la publicación y ve quiénes la vieron; el analista no entra al catálogo: solo el nombre
  const enlaceDe = (id: string) => (esAdmin ? `/admin/publicaciones/${id}` : null);

  const favoritas = [
    { titulo: "La más vista", publicacion: reporte.mas_vista },
    { titulo: "La más guardada", publicacion: reporte.mas_guardada },
  ];

  return (
    <>
      <Cifras
        cifras={[
          {
            titulo: "Personas alcanzadas",
            valor: numero(alcance.personas_que_vieron),
            nota: `${porcentaje(alcance.personas_que_vieron, embudo.activos)} de las cuentas activas`,
          },
          { titulo: "Vistas", valor: numero(alcance.vistas), nota: `detalles de remates abiertos en ${textoPeriodo}` },
          { titulo: "Guardados", valor: numero(alcance.guardados), nota: plural(alcance.quitados, "quitado", "quitados") },
          {
            titulo: "Avisos leídos",
            valor: porcentaje(avisos.leidos, avisos.enviados),
            nota: `${numero(avisos.leidos)} de ${plural(avisos.enviados, "aviso enviado", "avisos enviados")}`,
          },
        ]}
      />

      <Tarjeta titulo={reporte.agrupado_por === "mes" ? "Vistas por mes" : "Vistas por día"}>
        <Grafico serie={reporte.serie} medida="vistas" porMes={reporte.agrupado_por === "mes"} />
      </Tarjeta>

      {/* La favorita del público */}
      <Tarjeta titulo="La favorita del público">
        <div className="rep-favoritas">
          {favoritas.map(({ titulo, publicacion }) => {
            const enlace = publicacion ? enlaceDe(publicacion.id) : null;
            return (
              <div key={titulo} className="rep-favorita">
                <p className="rep-favorita-titulo">{titulo}</p>
                {publicacion ? (
                  <>
                    {enlace ? (
                      <Link to={enlace} className="rep-favorita-nombre">
                        {publicacion.title}
                      </Link>
                    ) : (
                      <strong className="rep-favorita-nombre">{publicacion.title}</strong>
                    )}
                    <p className="rep-favorita-datos">
                      {publicacion.comuna ?? "Sin comuna"} ·{" "}
                      {titulo === "La más vista"
                        ? `${plural(publicacion.vistas, "vista", "vistas")} de ${plural(publicacion.personas, "persona", "personas")}`
                        : plural(publicacion.guardados, "persona la guardó", "personas la guardaron")}
                    </p>
                  </>
                ) : (
                  <p className="rep-vacio">Todavía no hay datos en este período.</p>
                )}
              </div>
            );
          })}
        </div>
      </Tarjeta>

      {/* Las 10 más vistas */}
      <Tarjeta titulo="Remates con más alcance">
        {reporte.ranking.length === 0 ? (
          <p className="rep-vacio">Nadie abrió un remate en este período.</p>
        ) : (
          <ol className="rep-ranking">
            {reporte.ranking.map((publicacion, i) => {
              const enlace = enlaceDe(publicacion.id);
              return (
                <li key={publicacion.id}>
                  <span className="rep-puesto">{i + 1}</span>
                  <span className="rep-ranking-info">
                    {enlace ? <Link to={enlace}>{publicacion.title}</Link> : <strong>{publicacion.title}</strong>}
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
              );
            })}
          </ol>
        )}
        {esAdmin && <p className="rep-nota">Toca un remate para ver quiénes lo vieron y quiénes lo guardaron.</p>}
      </Tarjeta>

      <div className="rep-dos-columnas">
        <Tarjeta titulo="Avisos automáticos">
          <Barras
            filas={avisos.por_tipo.map((aviso) => ({
              nombre: NOMBRE_DEL_AVISO[aviso.tipo] ?? aviso.tipo,
              cantidad: aviso.enviados,
              nota: `${porcentaje(aviso.leidos, aviso.enviados)} leídos`,
            }))}
            vacio={`No se enviaron avisos en ${textoPeriodo}.`}
          />
          <p className="rep-nota">Los que reciben los inversionistas por sus alertas.</p>
        </Tarjeta>

        <Tarjeta titulo="Último anuncio">
          {anuncio ? (
            <div className="rep-anuncio">
              <p className="rep-anuncio-titulo">«{anuncio.titulo}»</p>
              <p className="rep-gris">Enviado el {fechaCorta(anuncio.enviado_el)}</p>
              <p className="rep-anuncio-cifra">
                <strong>{porcentaje(anuncio.leidos, anuncio.destinatarios)}</strong> lo leyó
              </p>
              <p className="rep-gris">
                {numero(anuncio.leidos)} de {plural(anuncio.destinatarios, "persona", "personas")}
              </p>
            </div>
          ) : (
            <p className="rep-vacio">Todavía no se ha enviado ningún anuncio.</p>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Desde dónde entran los inversionistas">
        <Barras
          filas={[
            { nombre: "Página web", cantidad: reporte.inicios_por_plataforma.web ?? 0 },
            { nombre: "App", cantidad: reporte.inicios_por_plataforma.app ?? 0 },
            { nombre: "Sin dato", cantidad: reporte.inicios_por_plataforma.sin_dato ?? 0 },
          ].filter((fila) => fila.nombre !== "Sin dato" || fila.cantidad > 0)}
          total={Object.values(reporte.inicios_por_plataforma).reduce((suma, n) => suma + n, 0)}
          vacio={`Ningún inversionista inició sesión en ${textoPeriodo}.`}
        />
        <p className="rep-nota">Inicios de sesión de {textoPeriodo}.</p>
      </Tarjeta>
    </>
  );
}