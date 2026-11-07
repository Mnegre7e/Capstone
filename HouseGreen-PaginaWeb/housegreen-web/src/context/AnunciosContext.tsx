import { createContext, useContext } from "react";

// Paso 90: los anuncios que el administrador le envió a la persona de la sesión.
// Están en un contexto porque los usan dos lugares: el número rojo del encabezado y la página Alertas.
// Paso 125e: aquí quedan los tipos, el contexto y useAnuncios. El componente AnunciosProvider
// está en AnunciosProvider.tsx (un archivo con componentes debe exportar solo componentes).

// Lo que devuelve GET /anuncios por cada anuncio
export interface AnuncioRecibido {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null; // null = todavía no lo lee
  property_id: string | null; // si el anuncio es sobre una publicación
  publicacion: string | null; // título de esa publicación
}

export interface AnunciosContextType {
  anuncios: AnuncioRecibido[];
  sinLeer: number;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  marcarLeido: (id: string) => void;
}

export const AnunciosContext = createContext<AnunciosContextType | undefined>(undefined);

export function useAnuncios() {
  const context = useContext(AnunciosContext);
  if (!context) {
    throw new Error("useAnuncios debe usarse dentro de un <AnunciosProvider>");
  }
  return context;
}