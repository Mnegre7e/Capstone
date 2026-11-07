import { createContext, useContext } from "react";

// Paso 125e: aquí quedan el tipo, el contexto y useFavorites. El componente FavoritesProvider
// está en FavoritesProvider.tsx (un archivo con componentes debe exportar solo componentes).

export interface FavoritesContextType {
  favoritos: string[]; // guardamos solo los ids de las propiedades favoritas
  esFavorito: (id: string) => boolean;
  alternarFavorito: (id: string) => Promise<void>;
}

export const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites debe usarse dentro de un <FavoritesProvider>");
  }
  return context;
}