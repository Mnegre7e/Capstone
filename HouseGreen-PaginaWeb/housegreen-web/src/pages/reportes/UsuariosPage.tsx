import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { CADA, fechaCorta, numero, pesos, plural, type ContextoReportes, type Medida } from "./formato";
import { Barras, Cifras, ElegirMedida, Grafico, Tarjeta } from "./piezas";

// Paso 115: Usuarios. Quiénes se registran, cuánto usan HouseGreen y qué opinan.
// Paso 123b: también el plan Premium: quiénes se suscribieron y quiénes dejaron de pagar.
export function UsuariosPage() {
  const { reporte, esAdmin, textoPeriodo } = useOutletContext<ContextoReportes>();
  const { usuarios, embudo, actividad, premium } = reporte;
  const [medida, setMedida] = useState<Medida>("registros"); // paso 123b: registros o suscripciones
  const opiniones = Object.values(reporte.calificaciones).reduce((suma, n) => suma + n, 0);

  return (
    <>
      <Cifras
        cifras={[
          { titulo: "Personas registradas", valor: numero(usuarios.total), nota: `${numero(usuarios.activos)} pueden entrar hoy` },
          { titulo: "Nuevas", valor: numero(usuarios.nuevos), nota: `se registraron en ${textoPeriodo}` },
          {
            titulo: "Bajas",
            valor: numero(usuarios.eliminaron_su_cuenta),
            nota: `eliminaron su cuenta · ${plural(usuarios.suspendidas, "suspendida", "suspendidas")} hoy`,
          },
          {
            titulo: "Calificación",
            valor: actividad.calificacion_promedio === null ? "—" : `${actividad.calificacion_promedio.toLocaleString("es-CL")} / 5`,
            nota: plural(actividad.opiniones, "opinión", "opiniones") + ` en ${textoPeriodo}`,
          },
        ]}
      />

      <Tarjeta
        titulo={`${medida === "suscripciones" ? "Suscripciones" : "Registros"} ${CADA[reporte.agrupado_por].por}`}
        extra={<ElegirMedida opciones={["registros", "suscripciones"]} medida={medida} onCambiar={setMedida} />}
      >
        <Grafico serie={reporte.serie} medida={medida} agrupado={reporte.agrupado_por} />
      </Tarjeta>

      {/* Paso 123b: plan Premium (no cambia con los filtros de remates) */}
      <Tarjeta titulo="Plan Premium">
        <div className="rep-datos">
          <p>
            <strong>{numero(premium.con_premium)}</strong>
            <span>con Premium hoy</span>
          </p>
          <p>
            <strong>{numero(premium.suscripciones)}</strong>
            <span>
              {premium.suscripciones === 1 ? "suscripción" : "suscripciones"} en {textoPeriodo}:{" "}
              {plural(premium.nuevas, "nueva", "nuevas")} · {plural(premium.renovaciones, "renovación", "renovaciones")}
            </span>
          </p>
          <p>
            <strong>{pesos(premium.ingresos)}</strong>
            <span>recaudado en {textoPeriodo}</span>
          </p>
          <p>
            <strong>{numero(premium.dejaron_de_pagar)}</strong>
            <span>dejaron de pagar: su plan venció en {textoPeriodo} y no lo renovaron</span>
          </p>
        </div>
        {premium.ambiente === "integracion" && (
          <p className="rep-nota">Son pagos de prueba: Webpay está en el ambiente de integración (sin dinero real).</p>
        )}
      </Tarjeta>

      {/* Paso 123b: solo el administrador ve quiénes son (el analista ve los totales) */}
      {esAdmin && premium.pagos && premium.vencidos && (
        <div className="rep-dos-columnas">
          <Tarjeta titulo="Se suscribieron">
            {premium.pagos.length === 0 ? (
              <p className="rep-vacio">Nadie pagó el plan en {textoPeriodo}.</p>
            ) : (
              <ol className="rep-ranking is-sin-puesto">
                {premium.pagos.map((pago) => (
                  <li key={pago.pago_id}>
                    <span className="rep-ranking-info">
                      <strong className="rep-persona">{pago.full_name}</strong>
                      <span className="rep-gris">{pago.email}</span>
                    </span>
                    <span className="rep-ranking-cifras">
                      <span>
                        {fechaCorta(pago.pagado_el)} · {pesos(pago.monto)}
                      </span>
                      <span className="rep-gris">
                        {pago.nueva ? "Primera vez" : "Renovó"}
                        {pago.hasta && ` · hasta el ${fechaCorta(pago.hasta)}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {premium.suscripciones > premium.pagos.length && (
              <p className="rep-nota">Se muestran los {numero(premium.pagos.length)} pagos más recientes.</p>
            )}
            <p className="rep-nota">
              <Link to="/admin/pagos" className="rep-enlace">
                Ver todos los pagos ›
              </Link>
            </p>
          </Tarjeta>

          <Tarjeta titulo="Dejaron de pagar">
            {premium.vencidos.length === 0 ? (
              <p className="rep-vacio">A nadie se le venció el plan en {textoPeriodo}.</p>
            ) : (
              <ol className="rep-ranking is-sin-puesto">
                {premium.vencidos.map((persona) => (
                  <li key={persona.user_id}>
                    <span className="rep-ranking-info">
                      <strong className="rep-persona">{persona.full_name}</strong>
                      <span className="rep-gris">{persona.email}</span>
                    </span>
                    <span className="rep-ranking-cifras">
                      <span>Venció el {fechaCorta(persona.vencio_el)}</span>
                      <span className="rep-gris">
                        {persona.pagos === 0 ? "sin pagos" : `pagó ${plural(persona.pagos, "vez", "veces")}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {premium.dejaron_de_pagar > premium.vencidos.length && (
              <p className="rep-nota">Se muestran los {numero(premium.vencidos.length)} más recientes.</p>
            )}
            <p className="rep-nota">
              <Link to="/admin/usuarios?plan=vencido" className="rep-enlace">
                Ver en Usuarios ›
              </Link>
            </p>
          </Tarjeta>
        </div>
      )}

      <Tarjeta titulo="Embudo">
        <Barras
          filas={[
            { nombre: "Cuentas activas", cantidad: embudo.activos },
            { nombre: "Vieron al menos un remate", cantidad: embudo.vieron },
            { nombre: "Tienen remates guardados", cantidad: embudo.guardaron },
            { nombre: "Tienen alertas", cantidad: embudo.con_alertas },
          ]}
          total={embudo.activos}
          vacio="Todavía no hay inversionistas con la cuenta activa."
        />
        <p className="rep-nota">Desde el inicio. El porcentaje es sobre las cuentas activas.</p>
      </Tarjeta>

      <div className="rep-dos-columnas">
        <Tarjeta titulo="Comunas más seguidas">
          <Barras filas={reporte.comunas_seguidas} vacio="Nadie tiene alertas activas." />
          <p className="rep-nota">Según las alertas activas de los inversionistas.</p>
        </Tarjeta>

        <Tarjeta titulo="Calificaciones">
          <Barras
            filas={[5, 4, 3, 2, 1].map((nota) => ({
              nombre: `${nota} ${nota === 1 ? "estrella" : "estrellas"}`,
              cantidad: reporte.calificaciones[String(nota)] ?? 0,
            }))}
            total={opiniones}
            vacio={`No hubo opiniones en ${textoPeriodo}.`}
          />
        </Tarjeta>
      </div>

      <div className="rep-dos-columnas">
        <Tarjeta titulo="Desde dónde se registraron">
          <Barras
            filas={[
              { nombre: "Página web", cantidad: usuarios.por_plataforma.web ?? 0 },
              { nombre: "App", cantidad: usuarios.por_plataforma.app ?? 0 },
              { nombre: "Sin dato", cantidad: usuarios.por_plataforma.sin_dato ?? 0 },
            ].filter((fila) => fila.nombre !== "Sin dato" || fila.cantidad > 0)}
            total={usuarios.nuevos}
            vacio={`Nadie se registró en ${textoPeriodo}.`}
          />
          {(usuarios.por_plataforma.sin_dato ?? 0) > 0 && (
            <p className="rep-nota">"Sin dato": cuentas creadas antes de que se registrara desde dónde.</p>
          )}
        </Tarjeta>

        <Tarjeta titulo="Inicios de sesión">
          <Barras
            filas={[
              { valor: "inversionista", nombre: "Inversionistas" },
              { valor: "analista", nombre: "Analistas" },
              { valor: "administrador", nombre: "Administradores" },
            ].map((tipo) => ({
              nombre: tipo.nombre,
              cantidad: actividad.inicios_de_sesion[tipo.valor] ?? 0,
              nota: plural(actividad.personas_que_entraron[tipo.valor] ?? 0, "persona", "personas"),
            }))}
            vacio={`Nadie inició sesión en ${textoPeriodo}.`}
          />
        </Tarjeta>
      </div>

      {/* Solo el administrador: quiénes fueron los más activos (el analista no ve datos personales) */}
      {esAdmin && reporte.personas_mas_activas && (
        <Tarjeta titulo="Personas más activas">
          {reporte.personas_mas_activas.length === 0 ? (
            <p className="rep-vacio">Nadie vio ni guardó remates en este período.</p>
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
          <p className="rep-nota">Solo lo ve el administrador: el analista ve los totales sin datos personales.</p>
        </Tarjeta>
      )}
    </>
  );
}