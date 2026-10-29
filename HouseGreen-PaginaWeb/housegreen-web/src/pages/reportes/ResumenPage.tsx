import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { numero, plural, porcentaje, type ContextoReportes, type Medida } from "./formato";
import { BarraSemaforo, Cifras, ElegirMedida, Grafico, Tarjeta } from "./piezas";

// Paso 115: Resumen. Lo más importante de las otras tres pantallas, de un vistazo.
export function ResumenPage() {
  const { reporte, textoPeriodo } = useOutletContext<ContextoReportes>();
  const [medida, setMedida] = useState<Medida>("vistas");
  const { usuarios, subastas, alcance, embudo } = reporte;

  return (
    <>
      <Cifras
        cifras={[
          {
            titulo: "Remates vigentes",
            valor: numero(subastas.vigentes),
            nota: `${plural(subastas.rematan_pronto, "se remata", "se rematan")} en los próximos 7 días`,
          },
          {
            titulo: "Personas registradas",
            valor: numero(usuarios.total),
            nota: `${plural(usuarios.nuevos, "nueva", "nuevas")} en ${textoPeriodo}`,
          },
          {
            titulo: "Personas que vieron remates",
            valor: numero(alcance.personas_que_vieron),
            nota: `${porcentaje(alcance.personas_que_vieron, embudo.activos)} de las cuentas activas`,
          },
          {
            titulo: "Guardados",
            valor: numero(alcance.guardados),
            nota: plural(alcance.quitados, "favorito quitado", "favoritos quitados"),
          },
        ]}
      />

      <Tarjeta
        titulo={reporte.agrupado_por === "mes" ? "Mes a mes" : "Día a día"}
        extra={
          <ElegirMedida
            opciones={["vistas", "guardados", "registros", "publicaciones"]}
            medida={medida}
            onCambiar={setMedida}
          />
        }
      >
        <Grafico serie={reporte.serie} medida={medida} porMes={reporte.agrupado_por === "mes"} />
      </Tarjeta>

      <Tarjeta titulo="Semáforo de los remates vigentes">
        <BarraSemaforo semaforo={reporte.publicaciones.semaforo} />
      </Tarjeta>
    </>
  );
}