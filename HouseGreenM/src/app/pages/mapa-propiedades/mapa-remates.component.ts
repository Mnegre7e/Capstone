import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { Feature, Polygon } from 'geojson';
import * as L from 'leaflet';

// Paso A8: el mapa de los remates, con Leaflet y los mapas de OpenStreetMap (igual que MapaRemates de la web).
// Este componente solo dibuja: qué puntos se muestran y qué pasa al elegir uno lo decide la página del mapa.
// Con el mapa alejado se ven las comunas (pintadas según cuántos remates tienen); al acercarse, o al tocar una
// comuna, aparecen los remates uno por uno.

/** El color del punto: el del semáforo, o "varios" si en ese lugar hay remates con distintos colores. */
export type ColorDelPunto = 'verde' | 'amarillo' | 'rojo' | 'varios';

export interface PuntoDelMapa {
  clave: string; // identifica el punto (un remate, un edificio con varios remates o una comuna)
  latitud: number;
  longitud: number;
  color: ColorDelPunto;
  aproximado: boolean; // true = ubicado en el centro de su comuna
  enSuCalle: boolean; // ubicado solo en su calle (OpenStreetMap no tiene el número): puede estar a unas cuadras
  cantidad: number; // cuántos remates hay en ese punto
  nombre: string; // lo que lee un lector de pantalla
}

/** Una comuna con su borde y cuántos remates tiene con los filtros elegidos. */
export interface ComunaDelMapa {
  nombre: string;
  forma: Feature<Polygon>; // el borde (archivo assets/mapas/comunas-rm.json)
  etiqueta: L.LatLngTuple; // dónde va el número y el nombre (un punto bien adentro de la comuna)
  cantidad: number;
  limitesRemates: L.LatLngTuple[]; // dónde están sus remates (para acercarse a ellos al tocarla)
}

export type ModoDelMapa = 'comunas' | 'puntos';

/** Desde este acercamiento se ven los remates; más lejos, las comunas. */
export const ZOOM_PARA_VER_REMATES = 13;

/** Colores de las comunas según cuántos remates tienen (azul, para no confundirlo con el semáforo). */
export const ESCALA_COMUNAS: { desde: number; texto: string; color: string }[] = [
  { desde: 1, texto: '1 a 4', color: '#dbe9f2' },
  { desde: 5, texto: '5 a 9', color: '#a9cbe1' },
  { desde: 10, texto: '10 a 19', color: '#6fa6cb' },
  { desde: 20, texto: '20 a 39', color: '#3b7cb0' },
  { desde: 40, texto: '40 o más', color: '#1d4f7e' },
];
const SIN_REMATES = '#eef1f0';

function colorDeComuna(cantidad: number): string {
  let color = SIN_REMATES;
  for (const paso of ESCALA_COMUNAS) if (cantidad >= paso.desde) color = paso.color;
  return color;
}

const CENTRO_DE_SANTIAGO: L.LatLngTuple = [-33.45, -70.66];

/** El dibujo de cada punto: un círculo de color (con el número de remates si hay más de uno). */
function iconoDe(punto: PuntoDelMapa): L.DivIcon {
  const clases = ['mapa-punto', `is-${punto.color}`];
  if (punto.cantidad > 1) clases.push('is-grupo');
  if (punto.aproximado) clases.push('is-aproximado');
  if (punto.enSuCalle) clases.push('is-calle');
  const lado = punto.cantidad > 1 ? 30 : 18;
  return L.divIcon({
    className: clases.join(' '),
    // Solo va un número: nunca texto del sitio de remates
    html: punto.cantidad > 1 ? `<span>${punto.cantidad > 99 ? '99+' : punto.cantidad}</span>` : '',
    iconSize: [lado, lado],
    iconAnchor: [lado / 2, lado / 2],
  });
}

/** El número y el nombre de la comuna (armado con textContent: nunca se interpreta como HTML). */
function etiquetaDe(comuna: ComunaDelMapa): L.DivIcon {
  const caja = document.createElement('span');
  caja.className = 'mapa-comuna-texto';
  if (comuna.cantidad >= 20) caja.classList.add('is-oscura');
  const numero = document.createElement('strong');
  numero.textContent = String(comuna.cantidad);
  const nombre = document.createElement('span');
  nombre.className = 'mapa-comuna-nombre';
  nombre.textContent = comuna.nombre;
  caja.append(numero, nombre);
  return L.divIcon({ className: 'mapa-comuna-etiqueta', html: caja, iconSize: [0, 0] });
}

@Component({
  selector: 'app-mapa-remates',
  template: `<div #contenedor class="mapa-leaflet" role="region" aria-label="Mapa de los remates"></div>`,
  styleUrls: ['./mapa-remates.component.scss'],
  // Los puntos los crea Leaflet (fuera de Angular): sus estilos tienen que ser globales
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class MapaRematesComponent implements AfterViewInit, OnDestroy {
  readonly puntos = input.required<PuntoDelMapa[]>();
  readonly comunas = input.required<ComunaDelMapa[]>();
  readonly soloUnaComuna = input(false); // con una comuna elegida en el filtro se ven siempre los remates
  readonly elegido = input<string | null>(null); // la clave del punto elegido
  readonly irA = input<{ nombre: string; vez: number } | null>(null); // pedir que se acerque a una comuna
  readonly elegir = output<string>();
  readonly cambiarModo = output<ModoDelMapa>();

  private contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  private mapa = signal<L.Map | null>(null);
  private capaPuntos = L.layerGroup();
  private capaComunas = L.layerGroup();
  private marcadores = new Map<string, L.Marker>();
  private observador: ResizeObserver | null = null;

  constructor() {
    // Cada vez que cambian los puntos (por los filtros), se dibujan de nuevo y el mapa los encuadra
    effect(() => {
      const mapa = this.mapa();
      const puntos = this.puntos();
      if (mapa) untracked(() => this.dibujarPuntos(mapa, puntos));
    });
    // Las comunas, pintadas según cuántos remates tienen
    effect(() => {
      const mapa = this.mapa();
      const comunas = this.comunas();
      if (mapa) untracked(() => this.dibujarComunas(comunas));
    });
    // Con una sola comuna en el filtro se ven siempre los remates
    effect(() => {
      this.soloUnaComuna();
      if (this.mapa()) untracked(() => this.actualizarModo());
    });
    // La página pide acercarse a una comuna (desde la lista del panel)
    effect(() => {
      const irA = this.irA();
      if (irA && this.mapa()) untracked(() => this.acercarseA(irA.nombre));
    });
    // El punto elegido queda marcado con un anillo
    effect(() => {
      const elegido = this.elegido();
      this.puntos();
      this.mapa();
      untracked(() =>
        this.marcadores.forEach((marcador, clave) => {
          marcador.getElement()?.classList.toggle('is-elegido', clave === elegido);
          marcador.setZIndexOffset(clave === elegido ? 1000 : 0);
        }),
      );
    });
  }

  ngAfterViewInit() {
    const contenedor = this.contenedor().nativeElement;
    const mapa = L.map(contenedor, { center: CENTRO_DE_SANTIAGO, zoom: 10, minZoom: 8, maxZoom: 18 });
    // Mapas de OpenStreetMap: piden mostrar siempre de dónde vienen (la línea de abajo a la derecha)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a> · Límites comunales: BCN',
    }).addTo(mapa);
    mapa.on('zoomend', () => this.actualizarModo());
    // En la app el mapa aparece con una animación: cuando cambia su tamaño, Leaflet vuelve a medirlo
    this.observador = new ResizeObserver(() => mapa.invalidateSize());
    this.observador.observe(contenedor);
    this.mapa.set(mapa);
  }

  ngOnDestroy() {
    this.observador?.disconnect();
    this.mapa()?.remove();
    this.mapa.set(null);
  }

  /** Muestra las comunas o los remates según qué tan cerca está el mapa. */
  private actualizarModo() {
    const mapa = this.mapa();
    if (!mapa) return;
    const modo: ModoDelMapa =
      !this.soloUnaComuna() && this.comunas().length > 0 && mapa.getZoom() < ZOOM_PARA_VER_REMATES ? 'comunas' : 'puntos';
    if (modo === 'comunas') {
      mapa.removeLayer(this.capaPuntos);
      mapa.addLayer(this.capaComunas);
    } else {
      mapa.removeLayer(this.capaComunas);
      mapa.addLayer(this.capaPuntos);
    }
    // Muy lejos, las comunas muestran solo el número (los nombres se taparían entre ellos)
    this.contenedor().nativeElement.classList.toggle('is-lejos', mapa.getZoom() <= 10);
    this.cambiarModo.emit(modo);
  }

  /** Acercarse a una comuna (a donde están sus remates, o a toda la comuna si no tiene). */
  private acercarseA(nombre: string) {
    const mapa = this.mapa();
    const comuna = this.comunas().find((c) => c.nombre === nombre);
    if (!mapa || !comuna) return;
    const limites =
      comuna.limitesRemates.length > 0 ? L.latLngBounds(comuna.limitesRemates) : L.geoJSON(comuna.forma).getBounds();
    const zoom = Math.min(Math.max(mapa.getBoundsZoom(limites, false, L.point(40, 40)), ZOOM_PARA_VER_REMATES), 15);
    mapa.setView(limites.getCenter(), zoom);
  }

  private dibujarPuntos(mapa: L.Map, puntos: PuntoDelMapa[]) {
    this.capaPuntos.clearLayers();
    this.marcadores.clear();
    for (const punto of puntos) {
      const marcador = L.marker([punto.latitud, punto.longitud], {
        icon: iconoDe(punto),
        title: punto.nombre,
        alt: punto.nombre,
        riseOnHover: true,
        keyboard: true, // se puede elegir con Tab y Enter
      });
      marcador.on('click', () => this.elegir.emit(punto.clave));
      marcador.on('keypress', (evento: L.LeafletKeyboardEvent) => {
        if (evento.originalEvent.key === 'Enter') this.elegir.emit(punto.clave);
      });
      this.capaPuntos.addLayer(marcador);
      this.marcadores.set(punto.clave, marcador);
    }
    if (puntos.length > 0) {
      const limites = L.latLngBounds(puntos.map((punto) => [punto.latitud, punto.longitud] as L.LatLngTuple));
      mapa.fitBounds(limites, { padding: [32, 32], maxZoom: 15 });
    }
    this.actualizarModo();
  }

  private dibujarComunas(comunas: ComunaDelMapa[]) {
    this.capaComunas.clearLayers();
    for (const comuna of comunas) {
      const forma = L.geoJSON(comuna.forma, {
        style: {
          color: 'white',
          weight: 1.5,
          fillColor: colorDeComuna(comuna.cantidad),
          fillOpacity: comuna.cantidad > 0 ? 0.78 : 0.45,
        },
      });
      forma.on('mouseover', () => forma.setStyle({ color: '#0f3d30', weight: 3 }));
      forma.on('mouseout', () => forma.setStyle({ color: 'white', weight: 1.5 }));
      forma.on('click', () => this.acercarseA(comuna.nombre));
      this.capaComunas.addLayer(forma);
      if (comuna.cantidad > 0) {
        const etiqueta = L.marker(comuna.etiqueta, {
          icon: etiquetaDe(comuna),
          title: `${comuna.nombre}: ${comuna.cantidad} ${comuna.cantidad === 1 ? 'remate' : 'remates'}`,
          keyboard: true,
        });
        etiqueta.on('click', () => this.acercarseA(comuna.nombre));
        etiqueta.on('keypress', (evento: L.LeafletKeyboardEvent) => {
          if (evento.originalEvent.key === 'Enter') this.acercarseA(comuna.nombre);
        });
        this.capaComunas.addLayer(etiqueta);
      }
    }
    this.actualizarModo();
  }
}
