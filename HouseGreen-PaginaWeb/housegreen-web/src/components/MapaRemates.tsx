import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Feature, Polygon } from "geojson";
import "leaflet/dist/leaflet.css";
import "./MapaRemates.css";

// Paso 124b: el mapa de los remates, con Leaflet y los mapas de OpenStreetMap.
// Este componente solo dibuja: qué puntos se muestran y qué pasa al elegir uno lo decide MapaPage.
// Paso 124c: con el mapa alejado se ven las comunas (pintadas según cuántos remates tienen);
// al acercarse, o al tocar una comuna, aparecen los remates uno por uno.

// El color del punto: el del semáforo, o "varios" si en ese lugar hay remates con distintos colores
export type ColorDelPunto = "verde" | "amarillo" | "rojo" | "varios";

export interface PuntoDelMapa {
  clave: string; // identifica el punto (un remate, un edificio con varios remates o una comuna)
  latitud: number;
  longitud: number;
  color: ColorDelPunto;
  aproximado: boolean; // true = ubicado en el centro de su comuna
  enSuCalle: boolean; // paso 124e: ubicado solo en su calle (OpenStreetMap no tiene el número): puede estar a unas cuadras
  cantidad: number; // cuántos remates hay en ese punto
  nombre: string; // lo que se lee al pasar el mouse (y lo que lee un lector de pantalla)
}

// Paso 124c: una comuna con su borde y cuántos remates tiene con los filtros elegidos
export interface ComunaDelMapa {
  nombre: string;
  forma: Feature<Polygon>; // el borde (archivo public/mapas/comunas-rm.json)
  etiqueta: L.LatLngTuple; // dónde va el número y el nombre (un punto bien adentro de la comuna)
  cantidad: number;
  limitesRemates: L.LatLngTuple[]; // dónde están sus remates (para acercarse a ellos al tocarla)
}

export type ModoDelMapa = "comunas" | "puntos";

// Paso 124c: desde este acercamiento se ven los remates; más lejos, las comunas
export const ZOOM_PARA_VER_REMATES = 13;

// Paso 124c: colores de las comunas según cuántos remates tienen (un solo tono, de claro a oscuro).
// Es azul para no confundirlo con los colores del semáforo.
export const ESCALA_COMUNAS: { desde: number; texto: string; color: string }[] = [
  { desde: 1, texto: "1 a 4", color: "#dbe9f2" },
  { desde: 5, texto: "5 a 9", color: "#a9cbe1" },
  { desde: 10, texto: "10 a 19", color: "#6fa6cb" },
  { desde: 20, texto: "20 a 39", color: "#3b7cb0" },
  { desde: 40, texto: "40 o más", color: "#1d4f7e" },
];
const SIN_REMATES = "#eef1f0";

export function colorDeComuna(cantidad: number) {
  let color = SIN_REMATES;
  for (const paso of ESCALA_COMUNAS) if (cantidad >= paso.desde) color = paso.color;
  return color;
}

interface MapaRematesProps {
  puntos: PuntoDelMapa[];
  comunas: ComunaDelMapa[];
  soloUnaComuna: boolean; // con una comuna elegida en el filtro se ven siempre los remates
  elegido: string | null; // la clave del punto elegido
  irA: { nombre: string; vez: number } | null; // pedirle al mapa que se acerque a una comuna
  onElegir: (clave: string) => void;
  onCambiarModo: (modo: ModoDelMapa) => void;
}

const CENTRO_DE_SANTIAGO: L.LatLngTuple = [-33.45, -70.66];

// El dibujo de cada punto: un círculo de color (con el número de remates si hay más de uno)
function iconoDe(punto: PuntoDelMapa) {
  const clases = ["mapa-punto", `is-${punto.color}`];
  if (punto.cantidad > 1) clases.push("is-grupo");
  if (punto.aproximado) clases.push("is-aproximado");
  if (punto.enSuCalle) clases.push("is-calle"); // paso 124e
  const lado = punto.cantidad > 1 ? 30 : 18;
  return L.divIcon({
    className: clases.join(" "),
    // Solo va un número: nunca texto del sitio de remates
    html: punto.cantidad > 1 ? `<span>${punto.cantidad > 99 ? "99+" : punto.cantidad}</span>` : "",
    iconSize: [lado, lado],
    iconAnchor: [lado / 2, lado / 2],
  });
}

// Paso 124c: el número y el nombre de la comuna (armado con textContent: nunca se interpreta como HTML)
function etiquetaDe(comuna: ComunaDelMapa) {
  const caja = document.createElement("span");
  caja.className = "mapa-comuna-texto";
  if (comuna.cantidad >= 20) caja.classList.add("is-oscura");
  const numero = document.createElement("strong");
  numero.textContent = String(comuna.cantidad);
  const nombre = document.createElement("span");
  nombre.className = "mapa-comuna-nombre";
  nombre.textContent = comuna.nombre;
  caja.append(numero, nombre);
  return L.divIcon({ className: "mapa-comuna-etiqueta", html: caja, iconSize: [0, 0] });
}

export function MapaRemates({ puntos, comunas, soloUnaComuna, elegido, irA, onElegir, onCambiarModo }: MapaRematesProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaPuntosRef = useRef<L.LayerGroup | null>(null);
  const capaComunasRef = useRef<L.LayerGroup | null>(null);
  const marcadoresRef = useRef(new Map<string, L.Marker>());
  const comunasRef = useRef(comunas);
  const soloUnaComunaRef = useRef(soloUnaComuna);
  // Las funciones más recientes que entregó MapaPage (así no hay que volver a dibujar cuando cambian)
  const onElegirRef = useRef(onElegir);
  const onCambiarModoRef = useRef(onCambiarModo);
  useEffect(() => {
    onElegirRef.current = onElegir;
    onCambiarModoRef.current = onCambiarModo;
    comunasRef.current = comunas;
    soloUnaComunaRef.current = soloUnaComuna;
  }, [onElegir, onCambiarModo, comunas, soloUnaComuna]);

  // Paso 124c: muestra las comunas o los remates según qué tan cerca está el mapa
  function actualizarModo() {
    const mapa = mapaRef.current;
    const puntosCapa = capaPuntosRef.current;
    const comunasCapa = capaComunasRef.current;
    if (!mapa || !puntosCapa || !comunasCapa) return;
    const modo: ModoDelMapa =
      !soloUnaComunaRef.current && comunasRef.current.length > 0 && mapa.getZoom() < ZOOM_PARA_VER_REMATES
        ? "comunas"
        : "puntos";
    if (modo === "comunas") {
      mapa.removeLayer(puntosCapa);
      mapa.addLayer(comunasCapa);
    } else {
      mapa.removeLayer(comunasCapa);
      mapa.addLayer(puntosCapa);
    }
    // Muy lejos, las comunas muestran solo el número (los nombres se taparían entre ellos)
    contenedorRef.current?.classList.toggle("is-lejos", mapa.getZoom() <= 10);
    onCambiarModoRef.current(modo);
  }

  // Paso 124c: acercarse a una comuna (a donde están sus remates, o a toda la comuna si no tiene)
  function acercarseA(nombre: string) {
    const mapa = mapaRef.current;
    const comuna = comunasRef.current.find((c) => c.nombre === nombre);
    if (!mapa || !comuna) return;
    const limites =
      comuna.limitesRemates.length > 0 ? L.latLngBounds(comuna.limitesRemates) : L.geoJSON(comuna.forma).getBounds();
    const zoom = Math.min(Math.max(mapa.getBoundsZoom(limites, false, L.point(40, 40)), ZOOM_PARA_VER_REMATES), 15);
    mapa.setView(limites.getCenter(), zoom);
  }
  const acercarseARef = useRef(acercarseA);
  const actualizarModoRef = useRef(actualizarModo);
  useEffect(() => {
    acercarseARef.current = acercarseA;
    actualizarModoRef.current = actualizarModo;
  });

  // 1) El mapa se crea una sola vez
  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;
    const mapa = L.map(contenedor, { center: CENTRO_DE_SANTIAGO, zoom: 10, minZoom: 8, maxZoom: 18 });
    // Mapas de OpenStreetMap: piden mostrar siempre de dónde vienen (la línea de abajo a la derecha).
    // Paso 124c: el fondo se ve en gris (MapaRemates.css) para que resalten los colores de los remates.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a> · Límites comunales: BCN',
    }).addTo(mapa);
    capaPuntosRef.current = L.layerGroup();
    capaComunasRef.current = L.layerGroup();
    mapaRef.current = mapa;
    mapa.on("zoomend", () => actualizarModoRef.current());
    return () => {
      mapa.remove();
      mapaRef.current = null;
      capaPuntosRef.current = null;
      capaComunasRef.current = null;
    };
  }, []);

  // 2) Cada vez que cambian los puntos (por los filtros), se dibujan de nuevo y el mapa los encuadra
  useEffect(() => {
    const mapa = mapaRef.current;
    const capa = capaPuntosRef.current;
    if (!mapa || !capa) return;
    capa.clearLayers();
    marcadoresRef.current.clear();
    for (const punto of puntos) {
      const marcador = L.marker([punto.latitud, punto.longitud], {
        icon: iconoDe(punto),
        title: punto.nombre,
        alt: punto.nombre,
        riseOnHover: true,
        keyboard: true, // se puede elegir con Tab y Enter
      });
      marcador.on("click", () => onElegirRef.current(punto.clave));
      // Con el teclado: Tab hasta el punto y Enter (Leaflet solo usa Enter para sus ventanas, así que se agrega aquí)
      marcador.on("keypress", (evento: L.LeafletKeyboardEvent) => {
        if (evento.originalEvent.key === "Enter") onElegirRef.current(punto.clave);
      });
      capa.addLayer(marcador);
      marcadoresRef.current.set(punto.clave, marcador);
    }
    if (puntos.length > 0) {
      const limites = L.latLngBounds(puntos.map((punto) => [punto.latitud, punto.longitud] as L.LatLngTuple));
      mapa.fitBounds(limites, { padding: [32, 32], maxZoom: 15 });
    }
    actualizarModoRef.current();
  }, [puntos]);

  // 3) Paso 124c: las comunas, pintadas según cuántos remates tienen
  useEffect(() => {
    const capa = capaComunasRef.current;
    if (!capa) return;
    capa.clearLayers();
    for (const comuna of comunas) {
      const forma = L.geoJSON(comuna.forma, {
        style: {
          color: "white",
          weight: 1.5,
          fillColor: colorDeComuna(comuna.cantidad),
          fillOpacity: comuna.cantidad > 0 ? 0.78 : 0.45,
        },
      });
      forma.on("mouseover", () => forma.setStyle({ color: "#0f3d30", weight: 3 }));
      forma.on("mouseout", () => forma.setStyle({ color: "white", weight: 1.5 }));
      forma.on("click", () => acercarseARef.current(comuna.nombre));
      capa.addLayer(forma);
      if (comuna.cantidad > 0) {
        const etiqueta = L.marker(comuna.etiqueta, {
          icon: etiquetaDe(comuna),
          title: `${comuna.nombre}: ${comuna.cantidad} ${comuna.cantidad === 1 ? "remate" : "remates"}`,
          keyboard: true,
        });
        etiqueta.on("click", () => acercarseARef.current(comuna.nombre));
        etiqueta.on("keypress", (evento: L.LeafletKeyboardEvent) => {
          if (evento.originalEvent.key === "Enter") acercarseARef.current(comuna.nombre);
        });
        capa.addLayer(etiqueta);
      }
    }
    actualizarModoRef.current();
  }, [comunas]);

  // 4) Con una sola comuna en el filtro se ven siempre los remates
  useEffect(() => {
    actualizarModoRef.current();
  }, [soloUnaComuna]);

  // 5) Paso 124c: MapaPage pide acercarse a una comuna (desde la lista del panel)
  useEffect(() => {
    if (irA) acercarseARef.current(irA.nombre);
  }, [irA]);

  // 6) El punto elegido queda marcado con un anillo (sin volver a dibujarlo, para no perder el foco)
  useEffect(() => {
    marcadoresRef.current.forEach((marcador, clave) => {
      marcador.getElement()?.classList.toggle("is-elegido", clave === elegido);
      marcador.setZIndexOffset(clave === elegido ? 1000 : 0);
    });
  }, [elegido, puntos]);

  return <div ref={contenedorRef} className="mapa-leaflet" role="region" aria-label="Mapa de los remates" />;
}