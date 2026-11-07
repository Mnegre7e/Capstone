import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { NOMBRE_ESTADO, textoCifras, textoCuando, textoDuracion, textoOrigen, type CargaResumen } from "./cargas";
import "./AdminCargasPage.css";

// Paso 121: historial de las cargas de remates. Cada mañana GitHub ejecuta la carga automática (paso 119)
// y cada carga, automática o hecha a mano, queda anotada en la tabla ingestion_runs. Aquí el administrador la revisa.

// El detalle que guarda cada carga (GET /admin/cargas/{id}). Las cargas antiguas traen menos datos.
interface Detalle {
  en_el_sitio?: number;
  nuevos?: string[];
  actualizados?: string[];
  retirados?: string[];
  fuera_del_listado?: string[];
  fichas_nuevas?: number;
  fichas_revisadas?: number;
  errores?: string[];
  precios_por_comuna?: {
    omitida?: string | null;
    comunas_leidas?: number;
    con_precios?: number;
    sin_tabla?: string[];
    sin_pagina?: string[];
  };
  zona_de_precio?: { cambiados?: number; verde?: number; amarillo?: number; rojo?: number; sin_referencia?: number };
  // Paso 124a: remates ubicados en el mapa (OpenStreetMap)
  mapa?: { ubicados?: number; direccion?: number; calle?: number; comuna?: number; sin_ubicacion?: number; quedan?: number };
  // Paso 124d: remates que el sitio publicó más de una vez (se muestra uno de cada grupo)
  repetidos?: { grupos?: number; escondidos?: number; cambios?: string[] };
  omitidos?: { sin_comuna?: string[]; sin_precio?: string[]; tipo_desconocido?: string[] };
}

type EstadoDetalle = Detalle | "cargando" | "error";

function numero(valor: number | undefined | null) {
  return (valor ?? 0).toLocaleString("es-CL");
}

// Cuántos hubo en una lista: el número de la carga, o el largo de la lista si es mayor
function cuantos(elementos?: string[], total?: number | null) {
  return Math.max(total ?? 0, elementos?.length ?? 0);
}

// Una lista de remates del detalle. "total" es cuántos hubo: la carga guarda como máximo 200 por lista.
function Lista({ titulo, elementos, total }: { titulo: string; elementos?: string[]; total?: number | null }) {
  const lista = elementos ?? [];
  const cantidad = cuantos(elementos, total);
  if (cantidad === 0) return null;
  return (
    <div className="car-bloque">
      <h3>
        {titulo} · {numero(cantidad)}
      </h3>
      {lista.length > 0 && (
        <ul className="car-remates">
          {lista.map((texto, i) => (
            <li key={i}>{texto}</li>
          ))}
        </ul>
      )}
      {cantidad > lista.length && (
        <p className="car-nota">
          {lista.length === 0
            ? "Esta carga no guardó la lista."
            : `Se guardaron solo los primeros ${numero(lista.length)}.`}
        </p>
      )}
    </div>
  );
}

function DetalleCarga({ carga, detalle }: { carga: CargaResumen; detalle: Detalle }) {
  const precios = detalle.precios_por_comuna;
  const zonas = detalle.zona_de_precio;
  const omitidos = detalle.omitidos ?? {};
  const fichas = (detalle.fichas_nuevas ?? 0) + (detalle.fichas_revisadas ?? 0);

  // Solo se muestra lo que la carga alcanzó a hacer: una carga que falló al principio guarda todo en cero,
  // y "se leyeron 0 comunas" o "cambiaron 0 zonas" haría creer que esos pasos sí se hicieron.
  const hayDelSitio = (detalle.en_el_sitio ?? 0) > 0 || fichas > 0;
  const hayPrecios =
    precios !== undefined &&
    (Boolean(precios.omitida) ||
      (precios.comunas_leidas ?? 0) > 0 ||
      (precios.sin_tabla?.length ?? 0) > 0 ||
      (precios.sin_pagina?.length ?? 0) > 0);
  const hayZonas =
    zonas !== undefined &&
    (zonas.cambiados ?? 0) + (zonas.verde ?? 0) + (zonas.amarillo ?? 0) + (zonas.rojo ?? 0) + (zonas.sin_referencia ?? 0) > 0;
  // Paso 124a
  const mapa = detalle.mapa;
  const hayMapa = mapa !== undefined && (mapa.ubicados ?? 0) + (mapa.quedan ?? 0) > 0;
  // Paso 124d
  const repetidos = detalle.repetidos;
  const hayRepetidos = repetidos !== undefined && ((repetidos.grupos ?? 0) > 0 || (repetidos.cambios?.length ?? 0) > 0);
  const hayListas =
    cuantos(detalle.nuevos, carga.created) +
      cuantos(detalle.actualizados, carga.updated) +
      cuantos(detalle.retirados, carga.withdrawn) +
      cuantos(detalle.fuera_del_listado) +
      cuantos(detalle.errores, carga.errors) +
      cuantos(omitidos.sin_comuna) +
      cuantos(omitidos.sin_precio) +
      cuantos(omitidos.tipo_desconocido) >
    0;

  if (!hayDelSitio && !hayPrecios && !hayZonas && !hayMapa && !hayRepetidos && !hayListas) {
    return (
      <p className="car-detalle car-nota">
        {carga.status === "fallida"
          ? "Esta carga se detuvo antes de leer remates: no hay más detalle que el motivo."
          : "Esta carga no encontró cambios."}
      </p>
    );
  }

  return (
    <div className="car-detalle">
      {hayDelSitio && (
        <div className="car-bloque">
          <h3>Del sitio</h3>
          {(detalle.en_el_sitio ?? 0) > 0 && (
            <p>
              Ese día el sitio publicaba {numero(detalle.en_el_sitio)} remates en todo Chile; {numero(carga.listed)} eran
              de la Región Metropolitana.
            </p>
          )}
          {fichas > 0 && (
            <p>
              Fichas leídas: {numero(detalle.fichas_nuevas)} nuevas y {numero(detalle.fichas_revisadas)} revisadas.
            </p>
          )}
        </div>
      )}

      <Lista titulo="Nuevos" elementos={detalle.nuevos} total={carga.created} />
      <Lista titulo="Actualizados" elementos={detalle.actualizados} total={carga.updated} />
      <Lista titulo="Retirados" elementos={detalle.retirados} total={carga.withdrawn} />
      <Lista
        titulo="Ya no están en el listado del sitio, pero su ficha sigue publicada"
        elementos={detalle.fuera_del_listado}
      />
      <Lista titulo="Errores" elementos={detalle.errores} total={carga.errors} />

      {/* Paso 124d: remates que el sitio publicó más de una vez */}
      {hayRepetidos && repetidos && (
        <div className="car-bloque">
          <h3>Remates repetidos</h3>
          <p>
            {numero(repetidos.grupos)} remates están publicados más de una vez en el sitio: se muestra uno de cada uno
            y quedan escondidos {numero(repetidos.escondidos)} repetidos.
          </p>
          {(repetidos.cambios?.length ?? 0) > 0 && (
            <ul className="car-remates">
              {(repetidos.cambios ?? []).map((texto, i) => (
                <li key={i}>{texto}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Paso 120a: precio típico de venta por comuna (una vez por semana) */}
      {hayPrecios && precios && (
        <div className="car-bloque">
          <h3>Precios por comuna (PropiedadesYa)</h3>
          {precios.omitida ? (
            <p>No tocaba actualizarlos: {precios.omitida}</p>
          ) : (
            <p>
              Se leyeron {numero(precios.comunas_leidas)} comunas; {numero(precios.con_precios)} tienen precios.
            </p>
          )}
          {(precios.sin_tabla?.length ?? 0) > 0 && <p>Sin tabla de precios: {precios.sin_tabla?.join(", ")}.</p>}
          {(precios.sin_pagina?.length ?? 0) > 0 && <p>Sin página: {precios.sin_pagina?.join(", ")}.</p>}
        </div>
      )}

      {/* Paso 120b: zona de precio del semáforo */}
      {hayZonas && zonas && (
        <div className="car-bloque">
          <h3>Zona de precio del semáforo</h3>
          <p>
            Cambiaron {numero(zonas.cambiados)}. Quedaron: verde {numero(zonas.verde)} · amarilla{" "}
            {numero(zonas.amarillo)} · roja {numero(zonas.rojo)} · sin referencia {numero(zonas.sin_referencia)}.
          </p>
        </div>
      )}

      {/* Paso 124a: ubicación en el mapa de los remates nuevos */}
      {hayMapa && mapa && (
        <div className="car-bloque">
          <h3>Mapa (OpenStreetMap)</h3>
          <p>
            Se ubicaron {numero(mapa.ubicados)}: {numero(mapa.direccion)} con su dirección, {numero(mapa.calle)} en su
            calle y {numero(mapa.comuna)} en el centro de su comuna
            {(mapa.sin_ubicacion ?? 0) > 0 && ` (${numero(mapa.sin_ubicacion)} sin ubicación)`}.
          </p>
          {(mapa.quedan ?? 0) > 0 && <p>Quedan {numero(mapa.quedan)} para la próxima carga.</p>}
        </div>
      )}

      <Lista titulo="No se cargaron: comuna desconocida" elementos={omitidos.sin_comuna} />
      <Lista titulo="No se cargaron: sin precio" elementos={omitidos.sin_precio} />
      <Lista titulo="No se cargaron: tipo de remate desconocido" elementos={omitidos.tipo_desconocido} />
    </div>
  );
}

export function AdminCargasPage() {
  const [cargas, setCargas] = useState<CargaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Detalles abiertos: { id de la carga: su detalle, "cargando" o "error" }
  const [abiertos, setAbiertos] = useState<Record<number, EstadoDetalle>>({});

  useEffect(() => {
    api
      .get("/admin/cargas")
      .then((datos: CargaResumen[]) => setCargas(datos))
      .catch((err) => setError(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => setCargando(false));
  }, []);

  async function alternarDetalle(id: number) {
    if (abiertos[id] !== undefined) {
      // Ya estaba abierto: se cierra
      setAbiertos((actuales) => {
        const copia = { ...actuales };
        delete copia[id];
        return copia;
      });
      return;
    }
    setAbiertos((actuales) => ({ ...actuales, [id]: "cargando" }));
    try {
      const respuesta: { detalle: Detalle } = await api.get(`/admin/cargas/${id}`);
      setAbiertos((actuales) => ({ ...actuales, [id]: respuesta.detalle ?? {} }));
    } catch {
      setAbiertos((actuales) => ({ ...actuales, [id]: "error" }));
    }
  }

  return (
    <section>
      <Link to="/admin" className="car-volver">
        ‹ Volver al Panel
      </Link>
      <h1 className="admin-titulo">Historial de cargas</h1>
      <p className="admin-subtitulo">
        Cada mañana se cargan solos los remates del sitio. Aquí queda cada carga, automática o hecha a mano.
      </p>
      <p className="car-ayuda">
        Para repetir una carga se usa el botón "Run workflow" en la pestaña Actions del repositorio en GitHub.
      </p>

      {error && <p className="car-error">No se pudo cargar el historial: {error}</p>}
      {cargando && <p className="car-cuenta">Cargando...</p>}
      {!cargando && !error && cargas.length === 0 && <div className="car-vacio">Todavía no hay cargas registradas.</div>}
      {!cargando && cargas.length > 0 && (
        <p className="car-cuenta">
          {cargas.length === 1 ? "1 carga" : `Últimas ${cargas.length} cargas`}, de la más nueva a la más antigua
        </p>
      )}

      <ul className="car-lista">
        {cargas.map((carga) => {
          const abierto = abiertos[carga.id];
          return (
            <li key={carga.id} className={`car-item is-${carga.status}`}>
              <div className="car-cabecera">
                <div className="car-info">
                  <p className="car-cuando">{textoCuando(carga.started_at)}</p>
                  <p className="car-meta">
                    {textoOrigen(carga.origin)} ·{" "}
                    {carga.status === "en_curso" ? "todavía corriendo" : textoDuracion(carga.minutos)}
                  </p>
                </div>
                <span className={`car-estado is-${carga.status}`}>
                  <span className="car-estado-punto" aria-hidden="true" />
                  {NOMBRE_ESTADO[carga.status]}
                </span>
              </div>

              {textoCifras(carga) && <p className="car-cifras">{textoCifras(carga)}</p>}
              {carga.error_message && <p className="car-motivo">Motivo: {carga.error_message}</p>}

              <button
                type="button"
                className="car-ver"
                aria-expanded={abierto !== undefined}
                onClick={() => alternarDetalle(carga.id)}
              >
                {abierto !== undefined ? "Ocultar detalle" : "Ver detalle"}
              </button>
              {abierto === "cargando" && <p className="car-detalle car-nota">Cargando el detalle...</p>}
              {abierto === "error" && <p className="car-detalle car-error">No se pudo cargar el detalle.</p>}
              {abierto !== undefined && typeof abierto === "object" && <DetalleCarga carga={carga} detalle={abierto} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}