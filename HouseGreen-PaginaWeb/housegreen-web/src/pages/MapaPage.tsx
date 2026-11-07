import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useProperties } from "../context/PropertiesContext";
import { AvisoPremium } from "../components/AvisoPremium";
import {
  MapaRemates,
  type ColorDelPunto,
  type ComunaDelMapa,
  type ModoDelMapa,
  type PuntoDelMapa,
} from "../components/MapaRemates";
import { ESCALA_COMUNAS } from "../components/coloresDelMapa"; // paso 125e
import { RiskBadge } from "../components/RiskBadge";
import { remateFinalizado, remateRetirado } from "../components/estadoRemate";
import { CATEGORIAS, categoriaDeTipo, type CategoriaTipo } from "../components/tipoPropiedad";
import "./MapaPage.css";

// Paso 124b: el mapa de los remates vigentes, con el color de su semáforo. Es solo para Premium
// (y para el administrador). La ubicación de cada remate la busca la API en OpenStreetMap (paso 124a).
// Paso 124c: con el mapa alejado se ven las comunas, con cuántos remates tiene cada una.
// Paso 124e: se distingue el remate ubicado solo en su calle, y cada remate tiene su enlace a Google Maps.

type Propiedad = ReturnType<typeof useProperties>["properties"][number];
type Nivel = "verde" | "amarillo" | "rojo";

// Lo que devuelve GET /mapa por cada remate
interface UbicacionApi {
  property_id: string;
  latitude: number;
  longitude: number;
  accuracy: "direccion" | "calle" | "comuna";
}

// Paso 124c: el archivo con el borde de las 52 comunas de la Región Metropolitana
// (Biblioteca del Congreso Nacional, simplificado). Está en public/mapas/comunas-rm.json.
interface ArchivoComunas {
  features: { properties: { nombre: string; etiqueta: [number, number] }; geometry: ComunaDelMapa["forma"]["geometry"] }[];
}

// "Estación Central" y "estacion central" son la misma comuna (sin tildes, espacios ni mayúsculas)
function nombreComparable(nombre: string) {
  return nombre.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[\s-]/g, "").toLowerCase();
}

// Un punto del mapa con los remates que hay en él
interface Grupo {
  punto: PuntoDelMapa;
  lugar: string; // "San Miguel", o la comuna del edificio
  remates: { propiedad: Propiedad; exactitud: UbicacionApi["accuracy"] }[];
}

const NIVELES: { valor: Nivel; nombre: string }[] = [
  { valor: "verde", nombre: "Riesgo bajo" },
  { valor: "amarillo", nombre: "Riesgo medio" },
  { valor: "rojo", nombre: "Riesgo alto" },
];

// Qué tan exacto es el punto, para la tarjeta del remate
const TEXTO_EXACTITUD: Record<UbicacionApi["accuracy"], string | null> = {
  direccion: null,
  calle: "Ubicado solo en su calle: OpenStreetMap no tiene el número, así que puede estar a unas cuadras.",
  comuna: "Sin dirección en OpenStreetMap: se muestra en el centro de su comuna.",
};

// Paso 124e: enlace a Google Maps con la dirección del remate (lo mismo que hace el detalle, paso 54).
// Google suele encontrar el número aunque OpenStreetMap no lo tenga. Se abre solo si la persona lo toca.
function urlGoogleMaps(direccion: string, comuna: string | undefined) {
  const comparable = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  // Se agrega la comuna si la dirección no la dice, y "Chile" si no termina así
  let texto = comuna && !comparable(direccion).includes(comparable(comuna)) ? `${direccion}, ${comuna}` : direccion;
  if (!comparable(texto).trim().endsWith("chile")) texto += ", Chile";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}`;
}

// Si no tiene evaluación se trata como riesgo medio (igual que en el catálogo)
function nivelDe(propiedad: Propiedad): Nivel {
  return propiedad.evaluation?.result_level ?? "amarillo";
}

function formatCLP(valor: number) {
  return valor.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

// "jue 15 dic · 12:00" (las 00:00 significan que el sitio no informó la hora)
function textoRemate(iso: string | null) {
  if (!iso) return "Fecha por confirmar";
  const fecha = new Date(iso);
  const dia = fecha.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
  if (fecha.getHours() === 0 && fecha.getMinutes() === 0) return dia;
  return `${dia} · ${fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

// Paso 124e: cómo se llama un punto con varios remates ("en San Miguel", "en la misma calle", "en el mismo lugar")
function tituloDelGrupo(grupo: Grupo) {
  if (grupo.punto.aproximado) return `en ${grupo.lugar} (centro de la comuna)`;
  if (grupo.punto.enSuCalle) return "en la misma calle";
  return "en el mismo lugar";
}

export function MapaPage() {
  const { usuario } = useAuth();
  const { properties, comunasPorId, cargando: cargandoCatalogo } = useProperties();
  const conAcceso = Boolean(usuario?.acceso_completo);

  const [ubicaciones, setUbicaciones] = useState<UbicacionApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comuna, setComuna] = useState(""); // vacío = todas
  const [tipo, setTipo] = useState<"" | CategoriaTipo>("");
  const [nivel, setNivel] = useState<"" | Nivel>("");
  const [conAproximados, setConAproximados] = useState(true);
  const [elegido, setElegido] = useState<string | null>(null);
  // Paso 124c: las comunas del mapa
  const [archivoComunas, setArchivoComunas] = useState<ArchivoComunas | null>(null);
  const [modo, setModo] = useState<ModoDelMapa>("puntos");
  const [irA, setIrA] = useState<{ nombre: string; vez: number } | null>(null);

  useEffect(() => {
    if (!conAcceso) return;
    api
      .get("/mapa")
      .then((datos: UbicacionApi[]) => setUbicaciones(datos))
      .catch((err) => setError(err instanceof Error ? err.message : "Error desconocido"));
    // Paso 124c: el borde de las comunas (si no carga, el mapa igual muestra los remates)
    fetch("/mapas/comunas-rm.json") // Vite entrega lo que está en la carpeta public/
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((datos: ArchivoComunas | null) => setArchivoComunas(datos))
      .catch(() => setArchivoComunas(null));
  }, [conAcceso]);

  // Los remates vigentes (no finalizados ni retirados), con su ubicación si ya la tienen
  const vigentes = useMemo(
    () => properties.filter((p) => !remateFinalizado(p.auction_date) && !remateRetirado(p.status)),
    [properties]
  );
  const ubicacionPorId = useMemo(() => {
    const mapa = new Map<string, UbicacionApi>();
    (ubicaciones ?? []).forEach((u) => mapa.set(u.property_id, u));
    return mapa;
  }, [ubicaciones]);

  // Las comunas que tienen remates en el mapa, para el filtro
  const comunas = useMemo(() => {
    const cantidades = new Map<number, number>();
    vigentes.forEach((p) => {
      if (ubicacionPorId.has(p.id)) cantidades.set(p.comuna_id, (cantidades.get(p.comuna_id) ?? 0) + 1);
    });
    return [...cantidades.entries()]
      .map(([id, cantidad]) => ({ id, nombre: comunasPorId[id] ?? "Sin comuna", cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [vigentes, ubicacionPorId, comunasPorId]);

  const filtrados = useMemo(
    () =>
      vigentes.filter(
        (p) =>
          (comuna === "" || String(p.comuna_id) === comuna) &&
          (tipo === "" || categoriaDeTipo(p.property_type) === tipo) &&
          (nivel === "" || nivelDe(p) === nivel)
      ),
    [vigentes, comuna, tipo, nivel]
  );

  // Los puntos del mapa. Los remates en el mismo lugar (varios departamentos de un edificio) van en un solo punto;
  // los de ubicación aproximada van todos juntos en el centro de su comuna.
  const grupos = useMemo(() => {
    const porClave = new Map<string, Grupo>();
    for (const propiedad of filtrados) {
      const ubicacion = ubicacionPorId.get(propiedad.id);
      if (!ubicacion) continue;
      const aproximado = ubicacion.accuracy === "comuna";
      if (aproximado && !conAproximados) continue;
      const clave = aproximado
        ? `comuna-${propiedad.comuna_id}`
        : `${ubicacion.latitude.toFixed(5)},${ubicacion.longitude.toFixed(5)}`;
      let grupo = porClave.get(clave);
      if (!grupo) {
        grupo = {
          lugar: comunasPorId[propiedad.comuna_id] ?? "Sin comuna",
          remates: [],
          punto: {
            clave,
            latitud: ubicacion.latitude,
            longitud: ubicacion.longitude,
            color: nivelDe(propiedad),
            aproximado,
            enSuCalle: ubicacion.accuracy === "calle", // paso 124e
            cantidad: 0,
            nombre: "",
          },
        };
        porClave.set(clave, grupo);
      }
      grupo.remates.push({ propiedad, exactitud: ubicacion.accuracy });
    }
    // El color, el número y el nombre de cada punto
    for (const grupo of porClave.values()) {
      const colores = new Set(grupo.remates.map((r) => nivelDe(r.propiedad)));
      grupo.punto.color = colores.size === 1 ? ([...colores][0] as ColorDelPunto) : "varios";
      grupo.punto.cantidad = grupo.remates.length;
      grupo.punto.enSuCalle = grupo.remates.every((r) => r.exactitud === "calle"); // paso 124e
      grupo.punto.nombre =
        grupo.remates.length === 1
          ? `${grupo.remates[0].propiedad.title}, ${NIVELES.find((n) => n.valor === nivelDe(grupo.remates[0].propiedad))?.nombre}` +
            (grupo.punto.enSuCalle ? " (ubicado solo en su calle)" : "")
          : `${grupo.remates.length} remates ${tituloDelGrupo(grupo)}`;
      grupo.remates.sort((a, b) => (a.propiedad.auction_date ?? "9").localeCompare(b.propiedad.auction_date ?? "9"));
    }
    return [...porClave.values()];
  }, [filtrados, ubicacionPorId, comunasPorId, conAproximados]);

  const puntos = useMemo(() => grupos.map((g) => g.punto), [grupos]);

  // Paso 124c: cada comuna con cuántos remates tiene (con los filtros elegidos) y dónde están
  const comunasDelMapa = useMemo<ComunaDelMapa[]>(() => {
    if (!archivoComunas) return [];
    const porNombre = new Map<string, { cantidad: number; limites: [number, number][] }>();
    for (const propiedad of filtrados) {
      const nombre = nombreComparable(comunasPorId[propiedad.comuna_id] ?? "");
      const datos = porNombre.get(nombre) ?? { cantidad: 0, limites: [] };
      datos.cantidad += 1;
      const ubicacion = ubicacionPorId.get(propiedad.id);
      if (ubicacion && ubicacion.accuracy !== "comuna") datos.limites.push([ubicacion.latitude, ubicacion.longitude]);
      porNombre.set(nombre, datos);
    }
    return archivoComunas.features.map((f) => {
      const datos = porNombre.get(nombreComparable(f.properties.nombre));
      return {
        nombre: f.properties.nombre,
        forma: { type: "Feature", properties: {}, geometry: f.geometry },
        etiqueta: f.properties.etiqueta,
        cantidad: datos?.cantidad ?? 0,
        limitesRemates: datos?.limites ?? [],
      };
    });
  }, [archivoComunas, filtrados, comunasPorId, ubicacionPorId]);
  const comunasConRemates = comunasDelMapa
    .filter((c) => c.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es"));
  const grupoElegido = grupos.find((g) => g.punto.clave === elegido) ?? null;

  const enElMapa = grupos.reduce((suma, g) => suma + g.remates.length, 0);
  // Paso 124e: cuántos quedaron en su dirección, solo en su calle o en el centro de su comuna
  const porExactitud: Record<UbicacionApi["accuracy"], number> = { direccion: 0, calle: 0, comuna: 0 };
  grupos.forEach((g) => g.remates.forEach((r) => (porExactitud[r.exactitud] += 1)));
  const detalleExactitud = [
    porExactitud.direccion > 0 && `${porExactitud.direccion.toLocaleString("es-CL")} en su dirección exacta`,
    porExactitud.calle > 0 && `${porExactitud.calle.toLocaleString("es-CL")} solo en su calle`,
    porExactitud.comuna > 0 && `${porExactitud.comuna.toLocaleString("es-CL")} en el centro de su comuna`,
  ].filter(Boolean);
  const sinUbicar = filtrados.filter((p) => !ubicacionPorId.has(p.id)).length;
  const cargando = cargandoCatalogo || (ubicaciones === null && !error);

  function cambiarFiltro(cambio: () => void) {
    cambio();
    setElegido(null);
  }

  // Sin Premium: el aviso del plan, igual que en el detalle de un remate
  if (!conAcceso) {
    return (
      <div className="mapa-pagina">
        <AvisoPremium titulo="El mapa de los remates es parte del plan Premium">
          Con Premium ves dónde está cada remate de la Región Metropolitana, con el color de su semáforo.
        </AvisoPremium>
      </div>
    );
  }

  return (
    <div className="mapa-pagina">
      <h1>Mapa de remates</h1>
      <p className="mapa-subtitulo">Los remates vigentes de la Región Metropolitana, con el color de su semáforo.</p>

      <div className="mapa-filtros">
        <label>
          Comuna
          <select value={comuna} onChange={(e) => cambiarFiltro(() => setComuna(e.target.value))}>
            <option value="">Todas</option>
            {comunas.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nombre} ({c.cantidad})
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={tipo} onChange={(e) => cambiarFiltro(() => setTipo(e.target.value as "" | CategoriaTipo))}>
            <option value="">Todos</option>
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Riesgo
          <select value={nivel} onChange={(e) => cambiarFiltro(() => setNivel(e.target.value as "" | Nivel))}>
            <option value="">Todos</option>
            {NIVELES.map((n) => (
              <option key={n.valor} value={n.valor}>
                {n.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="mapa-casilla">
          <input
            type="checkbox"
            checked={conAproximados}
            onChange={(e) => cambiarFiltro(() => setConAproximados(e.target.checked))}
          />
          Mostrar los del centro de su comuna
        </label>
      </div>

      <p className="mapa-cuenta" aria-live="polite">
        {error
          ? `No se pudo cargar el mapa: ${error}`
          : cargando
            ? "Cargando el mapa..."
            : `${enElMapa === 1 ? "1 remate" : `${enElMapa.toLocaleString("es-CL")} remates`} en el mapa` +
              (detalleExactitud.length > 0 ? `: ${detalleExactitud.join(" · ")}` : "") +
              (sinUbicar > 0 ? ` · ${sinUbicar} todavía sin ubicar (se agregan en la próxima carga diaria)` : "")}
      </p>

      <div className="mapa-columnas">
        <MapaRemates
          puntos={puntos}
          comunas={comunasDelMapa}
          soloUnaComuna={comuna !== ""}
          elegido={elegido}
          irA={irA}
          onElegir={setElegido}
          onCambiarModo={setModo}
        />

        <aside className="mapa-panel" aria-live="polite">
          {grupoElegido ? (
            <>
              <div className="mapa-panel-cabecera">
                <h2>
                  {grupoElegido.remates.length === 1
                    ? grupoElegido.lugar
                    : `${grupoElegido.remates.length} remates ${tituloDelGrupo(grupoElegido)}`}
                </h2>
                <button type="button" className="mapa-cerrar" onClick={() => setElegido(null)}>
                  Cerrar
                </button>
              </div>
              {grupoElegido.punto.aproximado && grupoElegido.remates.length > 1 && (
                <p className="mapa-nota">
                  Estos remates no tienen una dirección que OpenStreetMap encuentre, así que se muestran en el centro de
                  su comuna.
                </p>
              )}
              {/* Paso 124e */}
              {grupoElegido.punto.enSuCalle && grupoElegido.remates.length > 1 && (
                <p className="mapa-nota">
                  OpenStreetMap no tiene los números de estas direcciones: el punto marca la calle, no cada remate. Con
                  «Ver en Google Maps» ves dónde está cada uno.
                </p>
              )}
              <ul className="mapa-remates">
                {grupoElegido.remates.map(({ propiedad, exactitud }) => (
                  <li key={propiedad.id} className="mapa-remate">
                    <RiskBadge riesgo={nivelDe(propiedad)} />
                    <h3>
                      <Link to={`/propiedades/${propiedad.id}`}>{propiedad.title}</Link>
                    </h3>
                    <p className="mapa-remate-direccion">{propiedad.address || "Sin dirección informada"}</p>
                    <p className="mapa-remate-datos">
                      <strong>{formatCLP(Number(propiedad.opening_price))}</strong> · Remate {textoRemate(propiedad.auction_date)}
                    </p>
                    {TEXTO_EXACTITUD[exactitud] && grupoElegido.remates.length === 1 && (
                      <p className="mapa-nota">{TEXTO_EXACTITUD[exactitud]}</p>
                    )}
                    {/* Paso 124e: Google Maps suele encontrar el número aunque OpenStreetMap no lo tenga */}
                    <div className="mapa-enlaces">
                      <Link to={`/propiedades/${propiedad.id}`} className="mapa-ver">
                        Ver detalle ›
                      </Link>
                      {propiedad.address && (
                        <a
                          className="mapa-google"
                          href={urlGoogleMaps(propiedad.address, comunasPorId[propiedad.comuna_id])}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver en Google Maps ↗
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : modo === "comunas" ? (
            // Paso 124c: con el mapa alejado, las comunas
            <>
              <h2>Remates por comuna</h2>
              <p className="mapa-nota">Toca una comuna (o acércate) para ver cada remate con el color de su semáforo.</p>
              <ul className="mapa-escala" aria-label="Cantidad de remates por comuna">
                {ESCALA_COMUNAS.map((paso) => (
                  <li key={paso.desde}>
                    <span style={{ backgroundColor: paso.color }} aria-hidden="true" />
                    {paso.texto}
                  </li>
                ))}
              </ul>
              <ul className="mapa-lista-comunas">
                {comunasConRemates.map((c) => (
                  <li key={c.nombre}>
                    <button type="button" onClick={() => setIrA({ nombre: c.nombre, vez: Date.now() })}>
                      <span>{c.nombre}</span>
                      <strong>{c.cantidad}</strong>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2>Toca un punto del mapa</h2>
              <p className="mapa-nota">
                Verás el remate con su precio, la fecha, el enlace a su detalle y su dirección en Google Maps.
              </p>
              {/* La leyenda: el color nunca va solo, siempre con su nombre */}
              <ul className="mapa-leyenda">
                {NIVELES.map((n) => (
                  <li key={n.valor}>
                    <span className={`mapa-leyenda-punto is-${n.valor}`} aria-hidden="true" />
                    {n.nombre}
                  </li>
                ))}
                <li>
                  <span className="mapa-leyenda-punto is-varios is-grupo" aria-hidden="true">
                    3
                  </span>
                  Varios remates en el mismo lugar
                </li>
                <li>
                  <span className="mapa-leyenda-punto is-verde is-calle" aria-hidden="true" />
                  Solo en su calle (puede estar a unas cuadras)
                </li>
                <li>
                  <span className="mapa-leyenda-punto is-aproximado" aria-hidden="true" />
                  Sin dirección: en el centro de su comuna
                </li>
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}