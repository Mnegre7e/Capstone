import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { UsuarioActual } from "../context/AuthContext";
import "./PagoResultadoPage.css";

// Paso 122d: resultado del pago con Webpay. La API, después de confirmar con Transbank,
// manda a la persona aquí: /premium/resultado?pago=<número del pago>.

type Estado = "pendiente" | "aprobado" | "rechazado" | "anulado" | "error";

// Lo que devuelve GET /pagos/{id}
interface Pago {
  id: number;
  status: Estado;
  amount: number;
  days: number;
  environment: string;
  buy_order: string;
  authorization_code: string | null;
  payment_type_code: string | null;
  card_last_digits: string | null;
  premium_until: string | null;
  created_at: string;
}

const TIPO_DE_PAGO: Record<string, string> = {
  VD: "Débito",
  VP: "Prepago",
  VN: "Crédito",
  VC: "Crédito en cuotas",
  SI: "Crédito, 3 cuotas sin interés",
  S2: "Crédito, 2 cuotas sin interés",
  NC: "Crédito, cuotas sin interés",
};

const TEXTOS: Record<Estado, { titulo: string; texto: string }> = {
  aprobado: { titulo: "¡Listo, ya eres Premium!", texto: "Tu pago fue aprobado." },
  rechazado: {
    titulo: "El pago fue rechazado",
    texto: "Webpay no autorizó el pago, así que no se hizo ningún cobro. Puedes intentarlo de nuevo.",
  },
  anulado: {
    titulo: "El pago se anuló",
    texto: "Se canceló en Webpay o se acabó el tiempo para pagar. No se hizo ningún cobro.",
  },
  error: {
    titulo: "No pudimos confirmar el pago",
    texto: "Hubo un problema al comunicarnos con Webpay. Si ves un cobro en tu tarjeta, cuéntanos desde Opinar.",
  },
  pendiente: {
    titulo: "Tu pago todavía no se confirma",
    texto: "Si cerraste la página de Webpay antes de terminar, vuelve al plan e inténtalo de nuevo.",
  },
};

function pesos(valor: number) {
  return valor.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function fechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

export function PagoResultadoPage() {
  const numero = new URLSearchParams(useLocation().search).get("pago");
  const { actualizarUsuario } = useAuth();
  const [pago, setPago] = useState<Pago | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(numero === null);

  useEffect(() => {
    if (numero === null) return;
    api
      .get(`/pagos/${numero}`)
      .then((datos: Pago) => {
        setPago(datos);
        // Si se aprobó, se vuelve a preguntar quién es: así la web ya lo trata como Premium
        if (datos.status === "aprobado") {
          api.get("/auth/me").then((usuario: UsuarioActual) => actualizarUsuario(usuario)).catch(() => undefined);
        }
      })
      .catch(() => setNoEncontrado(true));
  }, [numero, actualizarUsuario]);

  if (noEncontrado) {
    return (
      <div className="pago-resultado">
        <section className="pago-tarjeta is-error">
          <h1>No encontramos ese pago</h1>
          <p>Si acabas de pagar y no ves tu plan activo, revisa tu Perfil o vuelve a intentarlo.</p>
          <Link to="/premium" className="pago-boton">
            Volver al plan Premium
          </Link>
        </section>
      </div>
    );
  }

  if (!pago) {
    return <div className="pago-resultado">Confirmando el pago...</div>;
  }

  const textos = TEXTOS[pago.status];
  const aprobado = pago.status === "aprobado";

  return (
    <div className="pago-resultado">
      <section className={`pago-tarjeta is-${pago.status}`}>
        <span className="pago-icono" aria-hidden="true">
          {aprobado ? "✓" : pago.status === "pendiente" ? "…" : "✕"}
        </span>
        <h1>{textos.titulo}</h1>
        <p>{textos.texto}</p>
        {aprobado && pago.premium_until && (
          <p className="pago-hasta">
            Tu plan Premium está activo hasta el <strong>{fechaLarga(pago.premium_until)}</strong>.
          </p>
        )}

        {/* El comprobante: lo que informó Webpay (nunca el número completo de la tarjeta) */}
        <dl className="pago-datos">
          <div>
            <dt>Monto</dt>
            <dd>{pesos(pago.amount)}</dd>
          </div>
          <div>
            <dt>Plan</dt>
            <dd>Premium, {pago.days} días</dd>
          </div>
          <div>
            <dt>Orden de compra</dt>
            <dd>{pago.buy_order}</dd>
          </div>
          {pago.card_last_digits && (
            <div>
              <dt>Tarjeta</dt>
              <dd>
                {pago.payment_type_code ? `${TIPO_DE_PAGO[pago.payment_type_code] ?? pago.payment_type_code} · ` : ""}
                terminada en {pago.card_last_digits}
              </dd>
            </div>
          )}
          {aprobado && pago.authorization_code && (
            <div>
              <dt>Código de autorización</dt>
              <dd>{pago.authorization_code}</dd>
            </div>
          )}
        </dl>


        <div className="pago-botones">
          {aprobado ? (
            <Link to="/" className="pago-boton">
              Ver los remates
            </Link>
          ) : (
            <Link to="/premium" className="pago-boton">
              {pago.status === "error" ? "Volver al plan" : "Intentar de nuevo"}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}