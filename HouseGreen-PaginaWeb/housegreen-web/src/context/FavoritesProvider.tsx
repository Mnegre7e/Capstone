import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import { FavoritesContext } from "./FavoritesContext";

// Paso 125e: el proveedor de los favoritos, separado de FavoritesContext.tsx (que exporta el contexto y useFavorites).

// Lo que devuelve GET /favoritos (solo usamos el id de la propiedad)
interface FavoritoApi {
  property_id: string;
}

const SIN_FAVORITOS: string[] = [];

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const usuarioId = usuario?.id ?? null;
  // Paso 125e: los favoritos se guardan junto con de quién son. Así, al cerrar sesión o cambiar de cuenta,
  // no se muestran los de la cuenta anterior (antes se vaciaban con un setState dentro del efecto).
  const [datos, setDatos] = useState<{ de: string; ids: string[] } | null>(null);
  const favoritos = usuarioId !== null && datos?.de === usuarioId ? datos.ids : SIN_FAVORITOS;
  // Pasos 74c y 74d: para los clics seguidos sobre el mismo corazón.
  // enCurso = propiedades que tienen un pedido a la API sin responder.
  // deseado = cómo quiere la persona que quede cada una (true = guardada) según su último clic.
  const enCurso = useRef(new Set<string>());
  const deseado = useRef(new Map<string, boolean>());

  // Cambia la lista de favoritos de la cuenta conectada
  function cambiarFavoritos(cambio: (actuales: string[]) => string[]) {
    if (usuarioId === null) return;
    setDatos((anteriores) => ({
      de: usuarioId,
      ids: cambio(anteriores?.de === usuarioId ? anteriores.ids : []),
    }));
  }

  // Antes los favoritos se guardaban en el navegador (localStorage), así que no
  // se veían en otro computador ni en la base de datos. Ahora se piden a la API
  // (tabla saved_properties) cada vez que alguien inicia sesión.
  useEffect(() => {
    if (usuarioId === null) return;
    let vigente = true;
    api
      .get("/favoritos")
      .then((lista: FavoritoApi[]) => vigente && setDatos({ de: usuarioId, ids: lista.map((f) => f.property_id) }))
      .catch(() => vigente && setDatos({ de: usuarioId, ids: [] }));
    return () => {
      vigente = false;
    };
  }, [usuarioId]);

  function esFavorito(id: string) {
    return favoritos.includes(id);
  }

  async function alternarFavorito(id: string) {
    // Cómo debe quedar después de este clic: lo contrario de como estaba
    const guardar = !(deseado.current.get(id) ?? favoritos.includes(id));
    deseado.current.set(id, guardar);

    // 1. Cambiamos el corazón de inmediato, para que se sienta rápido
    cambiarFavoritos((actuales) => {
      const sinEsta = actuales.filter((favId) => favId !== id);
      return guardar ? [...sinEsta, id] : sinEsta;
    });

    // 2. Si la API todavía no responde un clic anterior sobre esta propiedad, no se manda otro pedido:
    //    el que está en curso (más abajo) revisa al terminar si la persona cambió de idea.
    //    Sin esto, los pedidos llegaban desordenados y el corazón quedaba distinto de la base.
    if (enCurso.current.has(id)) return;
    enCurso.current.add(id);

    // 3. Le avisamos a la API, y se repite solo si mientras tanto hubo más clics
    let enLaBase = !guardar; // lo que tenía la base antes de este clic
    try {
      while (deseado.current.get(id) !== enLaBase) {
        const objetivo = deseado.current.get(id) === true;
        if (objetivo) {
          await api.post(`/favoritos/${id}`, {});
        } else {
          await api.delete(`/favoritos/${id}`);
        }
        enLaBase = objetivo;
      }
    } catch (err) {
      // 4. Si la API falla, la pantalla no debe mostrar algo falso: se vuelve a pedir la lista real
      console.error("No se pudo actualizar el favorito:", err);
      try {
        const lista: FavoritoApi[] = await api.get("/favoritos");
        cambiarFavoritos(() => lista.map((f) => f.property_id));
      } catch {
        // Si tampoco se puede pedir la lista (sin conexión), se deja como estaba en la base
        cambiarFavoritos((actuales) => {
          const sinEsta = actuales.filter((favId) => favId !== id);
          return enLaBase ? [...sinEsta, id] : sinEsta;
        });
      }
    } finally {
      enCurso.current.delete(id);
      deseado.current.delete(id);
    }
  }

  return (
    <FavoritesContext.Provider value={{ favoritos, esFavorito, alternarFavorito }}>
      {children}
    </FavoritesContext.Provider>
  );
}