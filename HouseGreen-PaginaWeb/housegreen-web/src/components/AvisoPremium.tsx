import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BENEFICIOS_PREMIUM, DIAS_PREMIUM, PRECIO_PREMIUM_TEXTO } from "./planPremium";
import "./AvisoPremium.css";

// Paso 122b: aviso para quien no tiene el plan Premium.
// - "pagina": en lugar del detalle de una propiedad (con lo que incluye el plan).
// - "compacto": dentro de otra página, por ejemplo en lugar del formulario de alertas.
interface AvisoPremiumProps {
  titulo: string;
  children?: ReactNode; // una frase con el contexto (qué propiedad quería ver, por ejemplo)
  variante?: "pagina" | "compacto";
}

export function AvisoPremium({ titulo, children, variante = "pagina" }: AvisoPremiumProps) {
  return (
    <section className={`premium-aviso is-${variante}`}>
      <span className="premium-aviso-sello">
        {/* Candado */}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
          <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
        Plan Premium
      </span>

      <h2 className="premium-aviso-titulo">{titulo}</h2>
      {children && <p className="premium-aviso-texto">{children}</p>}

      {variante === "pagina" && (
        <ul className="premium-aviso-lista">
          {BENEFICIOS_PREMIUM.map((beneficio) => (
            <li key={beneficio}>{beneficio}</li>
          ))}
        </ul>
      )}

      <p className="premium-aviso-precio">
        <strong>{PRECIO_PREMIUM_TEXTO}</strong> por {DIAS_PREMIUM} días · pago único, sin renovación automática
      </p>

      <Link to="/premium" className="premium-aviso-boton">
        Hazte Premium
      </Link>
    </section>
  );
}