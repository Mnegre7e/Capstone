import { useOutletContext } from "react-router-dom";
import { CATEGORIAS, categoriaDeTipo } from "../../components/tipoPropiedad";
import { numero, porcentaje, type ContextoReportes } from "./formato";
import { BarraSemaforo, Barras, Cifras, Grafico, Tarjeta } from "./piezas";

// Paso 115: Subastas. Los remates que hay en HouseGreen: cuántos, dónde, de qué tipo y su semáforo.
export function SubastasPage() {
  const { reporte, textoPeriodo } = useOutletContext<ContextoReportes>();
  const { subastas, publicaciones } = reporte;

  // Los tipos vienen como los escribe el sitio ("Casa", "Sitio", "Lote"...): se agrupan como en el catálogo
  const porCategoria = new Map<string, number>();
  for (const [tipo, cantidad] of Object.entries(subastas.por_tipo)) {
    const categoria = categoriaDeTipo(tipo);
    porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + cantidad);
  }
  const filasPorTipo = CATEGORIAS.map((c) => ({ nombre: c.nombre, cantidad: porCategoria.get(c.valor) ?? 0 }))
    .filter((fila) => fila.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad);

  return (
    <>
      <Cifras
        cifras={[
          { titulo: "Remates vigentes", valor: numero(subastas.vigentes), nota: "en el catálogo hoy" },
          {
            titulo: "Publicados",
            valor: numero(publicaciones.nuevas),
            nota: `remates nuevos en ${textoPeriodo}`,
          },
          {
            titulo: "Se rematan pronto",
            valor: numero(subastas.rematan_pronto),
            nota: "en los próximos 7 días",
          },
          {
            titulo: "Semáforo revisado",
            valor: porcentaje(subastas.revisadas, subastas.vigentes),
            nota: `${numero(subastas.revisadas)} de ${numero(subastas.vigentes)} con zona de precio`,
          },
        ]}
      />

      <Tarjeta titulo={reporte.agrupado_por === "mes" ? "Remates publicados por mes" : "Remates publicados por día"}>
        <Grafico serie={reporte.serie} medida="publicaciones" porMes={reporte.agrupado_por === "mes"} />
      </Tarjeta>

      <Tarjeta titulo="Por semáforo">
        <BarraSemaforo semaforo={publicaciones.semaforo} />
      </Tarjeta>

      <div className="rep-dos-columnas">
        <Tarjeta titulo="Por comuna">
          <Barras filas={subastas.por_comuna} total={subastas.vigentes} vacio="No hay remates vigentes." />
        </Tarjeta>
        <Tarjeta titulo="Por tipo de propiedad">
          <Barras filas={filasPorTipo} total={subastas.vigentes} vacio="No hay remates vigentes." />
        </Tarjeta>
      </div>

      <p className="rep-nota">
        "Semáforo revisado" son los remates a los que el administrador ya les asignó la zona de precio: sin ese dato el
        semáforo se calcula con menos información.
      </p>
    </>
  );
}