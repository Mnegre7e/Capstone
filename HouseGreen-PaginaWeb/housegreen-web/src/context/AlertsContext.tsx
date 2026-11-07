import { createContext, useContext } from "react";

// Paso 94: las notificaciones de la persona (remates nuevos que calzan con sus alertas).
// Antes eran datos de ejemplo guardados en el navegador; ahora vienen de la API (tabla alerts).
// Están en un contexto porque las usan dos lugares: el número rojo del encabezado y la página Alertas.
// Paso 125e: aquí quedan los tipos, el contexto y useAlerts. El componente AlertsProvider
// está en AlertsProvider.tsx (un archivo con componentes debe exportar solo componentes).

// Lo que devuelve GET /alertas por cada notificación
export interface Notificacion {
  id: string;
  property_id: string | null; // null si la propiedad ya no existe
  property_title: string | null;
  alert_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AlertsContextType {
  notificaciones: Notificacion[];
  noLeidas: number;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: () => void;
}

export const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error("useAlerts debe usarse dentro de un <AlertsProvider>");
  }
  return context;
}