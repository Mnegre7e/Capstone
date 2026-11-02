import { useEffect, useState } from "react";
import { api } from "../api/client";
import "./PrecioComuna.css";

// Paso 120b: el precio mínimo del remate frente al precio típico de su comuna (GET /propiedades/{id}/precio).
// Es lo mismo que usa el semáforo para el factor de precio:
// 40 % o más bajo = 2 puntos · entre 15 % y 39,9 % = 1 punto · menos de 15 % = 0 puntos.
type Zona = "verde" | "amarillo" | "rojo";

interface Comparacion {
  disponible: boolean;
  motivo: string | null;
  etiqueta: string | null;
  comuna: string | null;
  precio_minimo_clp: string | null;
  precio_tipico_clp: string | null;
  precio_tipico_uf: string | null;
  avisos: number | null;
  superficie_tipica_m2: string | null;
  descuento_pct: number | null;
  zona: Zona | null;
  fuente: string | null;
  fuente_url: string | null;
  fecha: string | null;
}

const PUNTOS: Record<Zona, string> = { verde: "2 puntos", amarillo: "1 punto", rojo: "0 puntos" };

function pesos(valor: string | null) {
  return Number(valor ?? 0).toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function numero(valor: string | number | null) {
  return Number(valor ?? 0).toLocaleString("es-CL", { maximumFractionDigits: 1 });
}

// "2026-11-01" -> "1 nov 2026" (se arma la fecha a mano para que no cambie de día por la zona horaria)
function fechaCorta(texto: string) {
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

export function PrecioComuna({ propertyId }: { propertyId: string }) {
  const [datos, setDatos] = useState<Comparacion | null>(null);

  useEffect(() => {
    api
      .get(`/propiedades/${propertyId}/precio`)
      .then((respuesta: Comparacion) => setDatos(respuesta))
      .catch(() => setDatos(null)); // si falla, simplemente no se muestra la sección
  }, [propertyId]);

  if (!datos) return null;

  if (!datos.disponible || !datos.zona || datos.descuento_pct === null) {
    return (
      <div className="detail-seccion">
        <h2>Precio frente a la comuna</h2>
        <p className="precio-sin">
          {datos.motivo} Por eso el precio todavía no suma puntos en el semáforo.
        </p>
      </div>
    );
  }

  const descuento = datos.descuento_pct;
  const tipo = (datos.etiqueta ?? "propiedades").toLowerCase(); // "departamentos"
  const resultado =
    descuento >= 0
      ? `${numero(descuento)} % bajo el precio típico`
      : `${numero(-descuento)} % sobre el precio típico`;

  return (
    <div className="detail-seccion">
      <h2>Precio frente a la comuna</h2>

      <div className="precio-cifras">
        <div className="precio-cifra">
          <p className="precio-cifra-etiqueta">Precio mínimo de este remate</p>
          <p className="precio-cifra-valor">{pesos(datos.precio_minimo_clp)}</p>
        </div>
        <div className="precio-cifra">
          <p className="precio-cifra-etiqueta">
            Precio típico de {tipo} en {datos.comuna}
          </p>
          <p className="precio-cifra-valor">{pesos(datos.precio_tipico_clp)}</p>
          <p className="precio-cifra-nota">
            UF {numero(datos.precio_tipico_uf)} · mediana de {numero(datos.avisos)} avisos en venta
          </p>
        </div>
      </div>

      <p className={`precio-resultado is-${datos.zona}`}>
        <span className="precio-resultado-punto" aria-hidden="true" />
        <span>
          <strong>{resultado}</strong> · {PUNTOS[datos.zona]} en el semáforo
        </span>
      </p>

      <p className="precio-regla">
        2 puntos: 40 % o más bajo · 1 punto: entre 15 % y 39,9 % bajo · 0 puntos: menos de 15 % bajo
      </p>

      <p className="precio-nota">
        El precio típico es la mediana de los {tipo} en venta en {datos.comuna}
        {datos.superficie_tipica_m2 ? `, que miden en general ${numero(datos.superficie_tipica_m2)} m²` : ""}, según{" "}
        {datos.fuente}
        {datos.fecha ? ` (actualizado el ${fechaCorta(datos.fecha)})` : ""}. Son precios de oferta y no consideran el
        tamaño de esta propiedad, así que úsalo como referencia.{" "}
        {datos.fuente_url && (
          <a href={datos.fuente_url} target="_blank" rel="noopener noreferrer">
            Ver la fuente ↗
          </a>
        )}
      </p>
    </div>
  );
}