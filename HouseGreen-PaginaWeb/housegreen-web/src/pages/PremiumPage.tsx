import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BENEFICIOS_PREMIUM, DIAS_PREMIUM, PRECIO_PREMIUM_TEXTO } from "../components/planPremium";
import "./PremiumPage.css";

// Paso 122b: página del plan Premium. Explica qué incluye y cuánto cuesta.
// El botón para pagar con Webpay se activa en el paso 122d.

// Qué ve cada uno: [lo que se ve, sin plan, con Premium]
const COMPARACION: [string, boolean, boolean][] = [
  ["Catálogo de remates", true, true],
  ["Color del semáforo", true, true],
  ["Detalle de cada remate", false, true],
  ["Puntaje del semáforo y por qué lo tiene", false, true],
  ["Precio frente a la comuna", false, true],
  ["Datos del remate y fotos", false, true],
  ["Favoritos y alertas", false, true],
];

// "2026-12-03T..." -> "3 de diciembre de 2026"
function fechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

function Marca({ incluido }: { incluido: boolean }) {
  return incluido ? (
    <span className="premium-marca is-si" aria-label="Sí">
      ✓
    </span>
  ) : (
    <span className="premium-marca is-no" aria-label="No">
      —
    </span>
  );
}

export function PremiumPage() {
  const { usuario, esAdmin, esAnalista } = useAuth();
  const vigente = Boolean(usuario?.acceso_completo);
  const vencio = !vigente && usuario?.premium_until != null;

  return (
    <div className="premium-page">
      <h1>Plan Premium</h1>
      <p className="premium-subtitulo">Todo el detalle de cada remate, para decidir con datos y no a ciegas.</p>

      <div className="premium-columnas">
        <section className="premium-plan" aria-labelledby="premium-precio">
          <span className="premium-plan-sello">Plan Premium</span>
          <p className="premium-plan-precio" id="premium-precio">
            <strong>{PRECIO_PREMIUM_TEXTO}</strong>
            <span>por {DIAS_PREMIUM} días</span>
          </p>

          <ul className="premium-plan-lista">
            {BENEFICIOS_PREMIUM.map((beneficio) => (
              <li key={beneficio}>{beneficio}</li>
            ))}
          </ul>

          {/* Lo que puede hacer según su cuenta */}
          {esAdmin || esAnalista ? (
            <p className="premium-plan-estado">
              Tu cuenta de {esAdmin ? "administrador" : "analista"} ya ve todo sin necesidad del plan.
            </p>
          ) : vigente && usuario?.premium_until ? (
            <>
              <p className="premium-plan-estado is-activo">
                Tu plan Premium está activo hasta el <strong>{fechaLarga(usuario.premium_until)}</strong>.
              </p>
              <Link to="/" className="premium-plan-boton">
                Ir a los remates
              </Link>
            </>
          ) : (
            <>
              {vencio && usuario?.premium_until && (
                <p className="premium-plan-estado">Tu plan Premium venció el {fechaLarga(usuario.premium_until)}.</p>
              )}
              <button type="button" className="premium-plan-boton" disabled>
                Pagar {PRECIO_PREMIUM_TEXTO} con Webpay
              </button>
              <p className="premium-plan-pronto">Muy pronto podrás pagar aquí con Webpay.</p>
            </>
          )}

          <p className="premium-plan-nota">
            Pago único con Webpay de Transbank. No se renueva solo: cuando vence, puedes volver a pagar. HouseGreen no
            guarda los datos de tu tarjeta.
          </p>
        </section>

        <section className="premium-comparar" aria-labelledby="premium-comparar-titulo">
          <h2 id="premium-comparar-titulo">Qué ves con cada opción</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">
                  <span className="premium-oculto">Lo que se ve</span>
                </th>
                <th scope="col">Sin plan</th>
                <th scope="col">Premium</th>
              </tr>
            </thead>
            <tbody>
              {COMPARACION.map(([texto, sinPlan, conPremium]) => (
                <tr key={texto}>
                  <th scope="row">{texto}</th>
                  <td>
                    <Marca incluido={sinPlan} />
                  </td>
                  <td>
                    <Marca incluido={conPremium} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link to="/" className="premium-volver">
            ‹ Volver al catálogo
          </Link>
        </section>
      </div>
    </div>
  );
}