import { useEffect, useState } from "react";
import { api, urlDeArchivo } from "../api/client";
import { SinFoto } from "./SinFoto";
import { NOTA_VISOR, useVistaCalle, VisorCalle, type VisorGoogle } from "./VistaCalle";
import "./GaleriaFotos.css";

// Una foto subida por el admin (GET /propiedades/{id}/fotos, paso 28)
interface Foto {
  id: string;
  url: string;
  label: string | null;
  position: number; // 0 = portada
}

interface GaleriaFotosProps {
  propertyId: string;
  imagenRespaldo: string | null; // la imagen de la propiedad, por si no tiene fotos subidas
  titulo: string;
  tipo: string; // tipo de propiedad: elige el dibujo cuando no hay ninguna foto (paso 52)
}

// Lo que se puede ver en grande: el visor de Google (vista de calle o mapa, pasos 135b y 135c)
// o una foto subida por el admin
type Cuadro = { tipo: "google"; visor: VisorGoogle } | { tipo: "foto"; foto: Foto };

const ICONO_CALLE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z" />
    <circle cx="12" cy="11" r="2.2" />
  </svg>
);

const ICONO_MAPA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />
  </svg>
);

// Foto grande con flechas y miniaturas para cambiarla (paso 29).
// Paso 135b: si hay vista de calle, es la FOTO PRINCIPAL (primer cuadro) y las fotos del admin van después.
// Paso 135c: si no tenemos el número, en su lugar va un mapa de Google con la dirección publicada.
export function GaleriaFotos({ propertyId, imagenRespaldo, titulo, tipo }: GaleriaFotosProps) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [actual, setActual] = useState(0); // posición del cuadro que se ve en grande
  const visor = useVistaCalle(propertyId);

  useEffect(() => {
    api
      .get(`/propiedades/${propertyId}/fotos`)
      .then((datos: Foto[]) => setFotos(datos))
      .catch(() => setFotos([])); // si falla, se muestra la imagen de respaldo
  }, [propertyId]);

  const cuadros: Cuadro[] = [
    ...(visor ? [{ tipo: "google" as const, visor }] : []),
    ...fotos.map((foto) => ({ tipo: "foto" as const, foto })),
  ];

  // Sin vista de calle ni fotos subidas: la imagen de la propiedad o, si tampoco tiene, el dibujo según su tipo
  if (cuadros.length === 0) {
    if (!imagenRespaldo) {
      return <SinFoto tipo={tipo} className="detail-image sin-foto-detalle" />;
    }
    return <img src={urlDeArchivo(imagenRespaldo)} alt={titulo} className="detail-image" />;
  }

  const posicion = Math.min(actual, cuadros.length - 1); // por si la vista de calle llega después de las fotos
  const cuadro = cuadros[posicion];
  // El % hace que después del último vuelva al primero (y al revés)
  const anterior = () => setActual((posicion - 1 + cuadros.length) % cuadros.length);
  const siguiente = () => setActual((posicion + 1) % cuadros.length);

  return (
    <div className="galeria">
      <div className="galeria-principal">
        {cuadro.tipo === "google" ? (
          <VisorCalle visor={cuadro.visor} titulo={titulo} />
        ) : (
          <>
            <img src={urlDeArchivo(cuadro.foto.url)} alt={cuadro.foto.label ?? titulo} className="detail-image" />
            {cuadro.foto.label && <span className="galeria-etiqueta">{cuadro.foto.label}</span>}
          </>
        )}

        {cuadros.length > 1 && (
          <>
            <button type="button" className="galeria-flecha galeria-flecha-izq" aria-label="Foto anterior" onClick={anterior}>
              ‹
            </button>
            <button type="button" className="galeria-flecha galeria-flecha-der" aria-label="Foto siguiente" onClick={siguiente}>
              ›
            </button>
            {/* Sobre el visor de Google no va el contador: taparía la marca de Google, que debe verse */}
            {cuadro.tipo === "foto" && (
              <span className="galeria-contador">
                {posicion + 1} / {cuadros.length}
              </span>
            )}
          </>
        )}
      </div>

      {cuadro.tipo === "google" && <p className="vista-calle-nota">{NOTA_VISOR[cuadro.visor.tipo]}</p>}

      {cuadros.length > 1 && (
        <div className="galeria-miniaturas">
          {cuadros.map((c, i) =>
            c.tipo === "google" ? (
              <button
                key="google"
                type="button"
                className={`galeria-miniatura galeria-miniatura-calle ${i === posicion ? "is-activa" : ""}`}
                aria-label={c.visor.tipo === "mapa" ? "Ver el mapa" : "Ver la vista de calle"}
                onClick={() => setActual(i)}
              >
                {c.visor.tipo === "mapa" ? ICONO_MAPA : ICONO_CALLE}
                <span>{c.visor.tipo === "mapa" ? "Mapa" : "Calle"}</span>
              </button>
            ) : (
              <button
                key={c.foto.id}
                type="button"
                className={`galeria-miniatura ${i === posicion ? "is-activa" : ""}`}
                aria-label={`Ver foto ${i + 1}${c.foto.label ? `: ${c.foto.label}` : ""}`}
                onClick={() => setActual(i)}
              >
                <img src={urlDeArchivo(c.foto.url)} alt="" />
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
