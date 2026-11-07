import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import { AlertsContext, type Notificacion } from "./AlertsContext";

// Paso 125e: el proveedor de las notificaciones, separado de AlertsContext.tsx (que exporta el contexto y useAlerts).

const SIN_NOTIFICACIONES: Notificacion[] = [];

function pedirNotificaciones(): Promise<Notificacion[]> {
  return api.get("/alertas");
}

function mensajeDeError(err: unknown) {
  return err instanceof Error ? err.message : "Error desconocido";
}

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const usuarioId = usuario?.id ?? null;
  // Paso 125e: las notificaciones se guardan junto con de quién son. Así, al cerrar sesión o cambiar
  // de cuenta, no se muestran las de la cuenta anterior (antes se vaciaban con un setState dentro del efecto).
  const [datos, setDatos] = useState<{ de: string; lista: Notificacion[] } | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notificaciones = usuarioId !== null && datos?.de === usuarioId ? datos.lista : SIN_NOTIFICACIONES;
  // "Cargando" mientras se piden, o si la cuenta conectada todavía no tiene respuesta de la API
  const cargando = pidiendo || (usuarioId !== null && datos?.de !== usuarioId && error === null);

  // Las recargas que piden las páginas (useCallback: siempre la misma función, así las páginas
  // pueden usarla en un useEffect sin que se repita sin parar)
  const recargar = useCallback(() => {
    if (usuarioId === null) return;
    setPidiendo(true);
    pedirNotificaciones()
      .then((lista) => {
        setDatos({ de: usuarioId, lista });
        setError(null);
      })
      .catch((err) => setError(mensajeDeError(err)))
      .finally(() => setPidiendo(false));
  }, [usuarioId]);

  // Se piden al iniciar sesión o al cambiar de cuenta. El estado se cambia solo cuando responde la API.
  useEffect(() => {
    if (usuarioId === null) return;
    let vigente = true;
    pedirNotificaciones()
      .then((lista) => {
        if (!vigente) return;
        setDatos({ de: usuarioId, lista });
        setError(null);
      })
      .catch((err) => vigente && setError(mensajeDeError(err)));
    return () => {
      vigente = false;
    };
  }, [usuarioId]);

  // Los datos de ejemplo que antes se guardaban en el navegador ya no se usan: se borran
  useEffect(() => {
    localStorage.removeItem("housegreen-alert-criterios");
    localStorage.removeItem("housegreen-alert-notificaciones");
  }, []);

  // Cambia las notificaciones de la cuenta conectada (para marcarlas leídas en la pantalla)
  function cambiarNotificaciones(cambio: (actuales: Notificacion[]) => Notificacion[]) {
    setDatos((anteriores) => (anteriores && anteriores.de === usuarioId ? { ...anteriores, lista: cambio(anteriores.lista) } : anteriores));
  }

  function marcarLeida(id: string) {
    const notificacion = notificaciones.find((n) => n.id === id);
    if (!notificacion || notificacion.is_read) return; // ya estaba leída: no hay nada que hacer

    // 1. Se marca de inmediato en la pantalla
    cambiarNotificaciones((actuales) => actuales.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    // 2. Se avisa a la API. Si falla, se vuelven a pedir para mostrar lo que hay de verdad en la base.
    api.patch(`/alertas/${id}/leida`).catch(() => recargar());
  }

  function marcarTodasLeidas() {
    cambiarNotificaciones((actuales) => actuales.map((n) => ({ ...n, is_read: true })));
    api.post("/alertas/leidas").catch(() => recargar());
  }

  const noLeidas = notificaciones.filter((n) => !n.is_read).length;

  return (
    <AlertsContext.Provider
      value={{ notificaciones, noLeidas, cargando, error: usuarioId === null ? null : error, recargar, marcarLeida, marcarTodasLeidas }}
    >
      {children}
    </AlertsContext.Provider>
  );
}