import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import { AnunciosContext, type AnuncioRecibido } from "./AnunciosContext";

// Paso 125e: el proveedor de los anuncios, separado de AnunciosContext.tsx (que exporta el contexto y useAnuncios).

const SIN_ANUNCIOS: AnuncioRecibido[] = [];

function pedirAnuncios(): Promise<AnuncioRecibido[]> {
  return api.get("/anuncios");
}

function mensajeDeError(err: unknown) {
  return err instanceof Error ? err.message : "Error desconocido";
}

export function AnunciosProvider({ children }: { children: ReactNode }) {
  const { usuario, esAdmin } = useAuth();
  // El administrador envía anuncios, no los recibe: para él no se le pregunta nada a la API
  const quienRecibe = usuario && !esAdmin ? usuario.id : null;
  // Paso 125e: los anuncios se guardan junto con de quién son. Así, al cerrar sesión o cambiar
  // de cuenta, no se muestran los de la cuenta anterior (antes se vaciaban con un setState dentro del efecto).
  const [datos, setDatos] = useState<{ de: string; lista: AnuncioRecibido[] } | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anuncios = quienRecibe !== null && datos?.de === quienRecibe ? datos.lista : SIN_ANUNCIOS;
  // "Cargando" mientras se piden, o si la cuenta conectada todavía no tiene respuesta de la API
  const cargando = pidiendo || (quienRecibe !== null && datos?.de !== quienRecibe && error === null);

  // Las recargas que piden las páginas (useCallback: siempre la misma función, así las páginas
  // pueden usarla en un useEffect sin que se repita sin parar)
  const recargar = useCallback(() => {
    if (quienRecibe === null) return;
    setPidiendo(true);
    pedirAnuncios()
      .then((lista) => {
        setDatos({ de: quienRecibe, lista });
        setError(null);
      })
      .catch((err) => setError(mensajeDeError(err)))
      .finally(() => setPidiendo(false));
  }, [quienRecibe]);

  // Se piden al iniciar sesión o al cambiar de cuenta. El estado se cambia solo cuando responde la API.
  useEffect(() => {
    if (quienRecibe === null) return;
    let vigente = true;
    pedirAnuncios()
      .then((lista) => {
        if (!vigente) return;
        setDatos({ de: quienRecibe, lista });
        setError(null);
      })
      .catch((err) => vigente && setError(mensajeDeError(err)));
    return () => {
      vigente = false;
    };
  }, [quienRecibe]);

  function marcarLeido(id: string) {
    const anuncio = anuncios.find((a) => a.id === id);
    if (!anuncio || anuncio.read_at !== null) return; // ya estaba leído: no hay nada que hacer

    // 1. Se marca de inmediato en la pantalla
    const ahora = new Date().toISOString();
    setDatos((anteriores) =>
      anteriores && anteriores.de === quienRecibe
        ? { ...anteriores, lista: anteriores.lista.map((a) => (a.id === id ? { ...a, read_at: ahora } : a)) }
        : anteriores
    );
    // 2. Se avisa a la API. Si falla, se vuelven a pedir para mostrar lo que hay de verdad en la base.
    api.patch(`/anuncios/${id}/leido`).catch(() => recargar());
  }

  const sinLeer = anuncios.filter((a) => a.read_at === null).length;

  return (
    <AnunciosContext.Provider
      value={{ anuncios, sinLeer, cargando, error: quienRecibe === null ? null : error, recargar, marcarLeido }}
    >
      {children}
    </AnunciosContext.Provider>
  );
}