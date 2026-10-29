import { useOutletContext } from "react-router-dom";
import { numero, plural, type ContextoReportes } from "./formato";
import { Barras, Cifras, Grafico, Tarjeta } from "./piezas";

// Paso 115: Usuarios. Quiénes se registran, cuánto usan HouseGreen y qué opinan.
export function UsuariosPage() {
  const { reporte, esAdmin, textoPeriodo } = useOutletContext<ContextoReportes>();
  const { usuarios, embudo, actividad } = reporte;
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

      <Tarjeta titulo={reporte.agrupado_por === "mes" ? "Registros por mes" : "Registros por día"}>
        <Grafico serie={reporte.serie} medida="registros" porMes={reporte.agrupado_por === "mes"} />
      </Tarjeta>

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