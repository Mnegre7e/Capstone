import { useEffect, useState } from "react";
import { EVENTO_CONECTANDO } from "../api/client";

// Paso A22: la API publicada en Render (plan gratis) se "duerme" tras 15 minutos sin uso y despierta en
// cerca de un minuto. Si una respuesta tarda más de 4 segundos, se avisa abajo para que nadie piense que
// la página se quedó pegada.
export function AvisoConectando() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const cambiar = (evento: Event) => setVisible((evento as CustomEvent<boolean>).detail);
    window.addEventListener(EVENTO_CONECTANDO, cambiar);
    return () => window.removeEventListener(EVENTO_CONECTANDO, cambiar);
  }, []);

  if (!visible) return null;
  return (
    <div className="aviso-conectando" role="status">
      <span className="aviso-conectando-punto" aria-hidden="true" />
      Conectando con HouseGreen… Si estuvo un rato sin uso, puede tardar hasta un minuto.
    </div>
  );
}
