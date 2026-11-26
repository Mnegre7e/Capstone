import { useEffect, useState } from "react";
import { api } from "../api/client";
import "./VistaCalle.css";

// Pasos 135, 135b y 135c: la FOTO PRINCIPAL del remate, con Google (GET /propiedades/{id}/vista-calle).
// - tipo "calle": vista de calle (Street View) cuando el remate quedó ubicado con calle y número.
// - tipo "mapa": mapa de Google con la dirección publicada, cuando solo tenemos la calle o la comuna.
// Si el equipo no configuró la clave de Google ("sin_clave"), se ve la foto de siempre.
// Reglas de Google: la imagen va dentro de su visor (con su marca) y no se descarga ni se guarda.
interface VistaCalleRespuesta {
  disponible: boolean;
  tipo: "calle" | "mapa" | null;
  url: string | null;
  motivo: string | null;
}

export interface VisorGoogle {
  tipo: "calle" | "mapa";
  url: string;
}

// Solo se aceptan los visores de Google (por seguridad, ninguna otra página entra en el recuadro)
const VISOR_DE_GOOGLE = "https://www.google.com/maps/embed/v1/";

/** El visor de Google para ese remate (vista de calle o mapa), o null si no hay. */
export function useVistaCalle(propertyId: string): VisorGoogle | null {
  const [visor, setVisor] = useState<VisorGoogle | null>(null);

  useEffect(() => {
    setVisor(null);
    api
      .get(`/propiedades/${propertyId}/vista-calle`)
      .then((r: VistaCalleRespuesta) =>
        setVisor(
          r.disponible && r.url?.startsWith(VISOR_DE_GOOGLE)
            ? { tipo: r.tipo === "mapa" ? "mapa" : "calle", url: r.url }
            : null,
        ),
      )
      .catch(() => setVisor(null)); // si falla, se ve la foto de siempre
  }, [propertyId]);

  return visor;
}

/** El visor de Google, del mismo tamaño que la foto principal. */
export function VisorCalle({ visor, titulo }: { visor: VisorGoogle; titulo: string }) {
  return (
    <iframe
      className="detail-image vista-calle"
      src={visor.url}
      title={`${visor.tipo === "mapa" ? "Mapa" : "Vista de calle"} de ${titulo} (Google)`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}

export const NOTA_VISOR = {
  calle:
    "Vista de calle referencial de Google: puede ser de hace algunos años y, en un edificio, muestra la fachada, " +
    "no la unidad que se remata. Puedes girarla y acercarte.",
  mapa:
    "Ubicación referencial: Google busca la dirección publicada en el remate. Confirma la dirección exacta en la " +
    "publicación original antes de ofertar.",
};
