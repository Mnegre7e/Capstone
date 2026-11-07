import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import { PropertiesContext, type ComunaApiResponse, type PropertyApiResponse } from "./PropertiesContext";

// Paso 125e: el proveedor del catálogo, separado de PropertiesContext.tsx (que exporta el contexto y useProperties).

// Pide el catálogo y las comunas EN PARALELO (Promise.all, más rápido que una después de la otra)
// y arma el mapa id -> nombre de la comuna. Está fuera del componente: solo devuelve los datos.
async function pedirCatalogo() {
  const [propiedades, comunas]: [PropertyApiResponse[], ComunaApiResponse[]] = await Promise.all([
    api.get("/propiedades"),
    api.get("/comunas"),
  ]);
  const comunasPorId: Record<number, string> = {};
  comunas.forEach((c) => {
    comunasPorId[c.id] = c.name;
  });
  return { propiedades, comunasPorId };
}

function mensajeDeError(err: unknown) {
  return err instanceof Error ? err.message : "Error al cargar propiedades";
}

export function PropertiesProvider({ children }: { children: ReactNode }) {
  const { usuario, verificandoSesion } = useAuth();
  const [properties, setProperties] = useState<PropertyApiResponse[]>([]);
  const [comunasPorId, setComunasPorId] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Las recargas que piden las páginas (useCallback: siempre la misma función, así las páginas pueden
  // usarla en un useEffect sin que se repita sin parar). Todo cambio de estado va después del await:
  // "Cargando..." solo se ve la primera vez; las recargas siguientes actualizan la lista en silencio.
  const recargar = useCallback(async () => {
    try {
      const datos = await pedirCatalogo();
      setProperties(datos.propiedades);
      setComunasPorId(datos.comunasPorId);
      setError(null);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  // Paso 122c: el catálogo se ve también sin cuenta (como invitado). Se pide de nuevo cada vez que cambia
  // quién está conectado o su plan, porque la API le entrega el semáforo y el detalle solo a quien tiene Premium.
  // Paso 125e: el estado se cambia solo cuando responde la API (regla de React: nada de setState directo
  // dentro de un efecto), y si cambia la cuenta antes de que responda, la respuesta vieja se ignora.
  const quien = usuario ? `${usuario.id}-${usuario.acceso_completo}` : "invitado";
  useEffect(() => {
    if (verificandoSesion) return; // primero se sabe si hay sesión, así el catálogo no se pide dos veces
    let vigente = true;
    pedirCatalogo()
      .then((datos) => {
        if (!vigente) return;
        setProperties(datos.propiedades);
        setComunasPorId(datos.comunasPorId);
        setError(null);
      })
      .catch((err) => vigente && setError(mensajeDeError(err)))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [verificandoSesion, quien]);

  return (
    <PropertiesContext.Provider value={{ properties, comunasPorId, cargando, error, recargar }}>
      {children}
    </PropertiesContext.Provider>
  );
}