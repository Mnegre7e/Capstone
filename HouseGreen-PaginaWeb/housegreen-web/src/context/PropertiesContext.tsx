import { createContext, useContext } from "react";

// Paso 125e: aquí quedan los tipos, el contexto y useProperties. El componente PropertiesProvider
// está en PropertiesProvider.tsx (un archivo con componentes debe exportar solo componentes).

export interface PropertyApiResponse {
  id: string;
  title: string;
  address: string | null;
  comuna_id: number;
  property_type: string;
  auction_type: "judicial" | "contribuciones" | "banco" | "extrajudicial";
  opening_price: string;
  auction_date: string | null; // fecha y hora del remate (paso 37); null si no se conoce
  status: string; // paso 71: "disponible", o "retirada" si el sitio de origen quitó el remate
  image_url: string | null;
  description: string | null;
  // Paso 55: de dónde viene la propiedad. Los remates del scraper traen
  // source_system = "rematesinmobiliarios" y en source_reference el número del remate en ese sitio
  source_system: string | null;
  source_reference: string | null;
  physical_info: { bedrooms: number | null; bathrooms: number | null; surface_m2: string | null } | null;
    // Última evaluación del semáforo (null si todavía no se ha evaluado)
  evaluation: {
    result_level: "verde" | "amarillo" | "rojo";
    total_points: number | null; // 0 a 10; null si faltan datos para calcular
    veto_applied: boolean;
    veto_reason: string | null; // motivo del veto o lista de datos que faltan
    is_complete: boolean; // false = faltan datos, no se pudo calcular el puntaje
    missing_data: string | null; // paso 63: los datos que faltaban, separados por "; "
    details: { criteria_name: string; points: number; has_data: boolean }[];
    evaluated_at: string;
  } | null;
  created_at: string; // fecha de publicación (para ordenar por "Más recientes")
}

export interface ComunaApiResponse {
  id: number;
  name: string;
}

export interface PropertiesContextType {
  properties: PropertyApiResponse[];
  comunasPorId: Record<number, string>;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
}

export const PropertiesContext = createContext<PropertiesContextType | undefined>(undefined);

export function useProperties() {
  const context = useContext(PropertiesContext);
  if (!context) {
    throw new Error("useProperties debe usarse dentro de un <PropertiesProvider>");
  }
  return context;
}