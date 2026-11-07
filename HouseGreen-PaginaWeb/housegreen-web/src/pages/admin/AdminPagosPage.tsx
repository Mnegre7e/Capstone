import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { fechaCorta } from "../../utils/opiniones";
import { textoCuando } from "./cargas";
import { NOMBRE_ESTADO_PAGO, TIPO_DE_PAGO, pesos, type EstadoPago, type PagoAdmin } from "./pagos";
import "./AdminPagosPage.css";

// Paso 122e: pagos del plan Premium. Es solo para mirar: el plan lo activa únicamente un pago aprobado por Webpay.

const POR_TANDA = 20; // cuántos pagos se muestran de una vez

const FILTROS_ESTADO: { valor: "" | EstadoPago; nombre: string }[] = [
  { valor: "", nombre: "Todos" },
  { valor: "aprobado", nombre: "Aprobados" },
  { valor: "rechazado", nombre: "Rechazados" },
  { valor: "anulado", nombre: "Anulados" },
  { valor: "sin_terminar", nombre: "Sin terminar" },
  { valor: "error", nombre: "Con error" },
  { valor: "pendiente", nombre: "En Webpay ahora" },
];

// Qué significa cada estado, en palabras simples (el motivo exacto, si Webpay lo dio, va aparte)
const EXPLICACION: Partial<Record<EstadoPago, string>> = {
  sin_terminar: "La persona salió de Webpay sin terminar de pagar. No se cobró nada.",
  pendiente: "La persona está en la página de Webpay en este momento.",
};

// "Irarrázaval" -> "irarrazaval": la búsqueda no distingue tildes ni mayúsculas
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function numero(valor: number) {
  return valor.toLocaleString("es-CL");
}

// "Prepago · terminada en 6590"
function textoTarjeta(pago: PagoAdmin) {
  if (!pago.card_last_digits) return null;
  const tipo = pago.payment_type_code ? `${TIPO_DE_PAGO[pago.payment_type_code] ?? pago.payment_type_code} · ` : "";
  return `${tipo}terminada en ${pago.card_last_digits}`;
}

export function AdminPagosPage() {
  const [pagos, setPagos] = useState<PagoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<"" | EstadoPago>(""); // vacío = todos
  const [tanda, setTanda] = useState(POR_TANDA);

  useEffect(() => {
    api
      .get("/admin/pagos")
      .then((datos: PagoAdmin[]) => setPagos(datos))
      .catch((err) => setError(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => setCargando(false));
  }, []);

  const texto = normalizar(busqueda.trim());
  const filtrados = pagos.filter(
    (p) =>
      (estado === "" || p.status === estado) &&
      (texto === "" ||
        normalizar(p.full_name ?? "").includes(texto) ||
        normalizar(p.email ?? "").includes(texto) ||
        p.buy_order.toLowerCase().includes(texto))
  );
  const visibles = filtrados.slice(0, tanda);

  // Resumen de arriba: solo los pagos aprobados
  const aprobados = pagos.filter((p) => p.status === "aprobado");
  const totalAprobado = aprobados.reduce((suma, p) => suma + p.amount, 0);
  const personas = new Set(aprobados.map((p) => p.user_id)).size;

  function cambiarFiltro(cambio: () => void) {
    cambio();
    setTanda(POR_TANDA);
  }

  return (
    <section>
      <Link to="/admin" className="pag-volver">
        ‹ Volver al Panel
      </Link>
      <h1 className="admin-titulo">Pagos del plan Premium</h1>
      <p className="admin-subtitulo">
        Cada vez que alguien intentó pagar con Webpay. Solo un pago aprobado activa el plan.
      </p>

      {error && <p className="pag-error">No se pudieron cargar los pagos: {error}</p>}
      {cargando && <p className="pag-cuenta">Cargando...</p>}

      {!cargando && !error && pagos.length === 0 && (
        <div className="pag-vacio">Todavía nadie ha intentado pagar el plan Premium.</div>
      )}

      {!cargando && !error && pagos.length > 0 && (
        <>
          <dl className="pag-resumen">
            <div>
              <dt>Pagos aprobados</dt>
              <dd>{numero(aprobados.length)}</dd>
            </div>
            <div>
              <dt>Total aprobado</dt>
              <dd>{pesos(totalAprobado)}</dd>
            </div>
            <div>
              <dt>Personas que pagaron</dt>
              <dd>{numero(personas)}</dd>
            </div>
          </dl>

          <div className="pag-filtros">
            <label className="pag-buscar">
              Buscar
              <input
                type="search"
                placeholder="Nombre, correo u orden de compra"
                value={busqueda}
                onChange={(e) => cambiarFiltro(() => setBusqueda(e.target.value))}
              />
            </label>
            <label>
              Estado
              <select
                value={estado}
                onChange={(e) => cambiarFiltro(() => setEstado(e.target.value as "" | EstadoPago))}
              >
                {FILTROS_ESTADO.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="pag-cuenta">
            {filtrados.length === pagos.length
              ? `Mostrando ${visibles.length} de ${pagos.length}, del más nuevo al más antiguo`
              : `${filtrados.length} de ${pagos.length} coinciden con los filtros`}
          </p>

          {filtrados.length === 0 && <div className="pag-vacio">Ningún pago coincide con esos filtros.</div>}

          <ul className="pag-lista">
            {visibles.map((p) => {
              const tarjeta = textoTarjeta(p);
              return (
                <li key={p.id} className={`pag-item is-${p.status}`}>
                  <div className="pag-cabecera">
                    <div className="pag-persona">
                      <h2>{p.full_name ?? "Cuenta sin nombre"}</h2>
                      <p>{p.email ?? "Sin correo"}</p>
                    </div>
                    <span className={`pag-estado is-${p.status}`}>
                      <span className="pag-estado-punto" aria-hidden="true" />
                      {NOMBRE_ESTADO_PAGO[p.status]}
                    </span>
                  </div>

                  <p className="pag-monto">
                    <strong>{pesos(p.amount)}</strong> · Premium {p.days} días{tarjeta && ` · ${tarjeta}`}
                  </p>

                  {p.status === "aprobado" && p.premium_until && (
                    <p className="pag-texto">
                      Dio Premium hasta el {fechaCorta(p.premium_until)}
                      {p.authorization_code && ` · Código de autorización ${p.authorization_code}`}
                    </p>
                  )}
                  {EXPLICACION[p.status] && <p className="pag-texto">{EXPLICACION[p.status]}</p>}
                  {p.status !== "aprobado" && p.error_message && (
                    <p className="pag-texto">Motivo: {p.error_message}</p>
                  )}

                  <p className="pag-meta">
                    {textoCuando(p.created_at)} · Orden {p.buy_order}
                  </p>
                </li>
              );
            })}
          </ul>

          {filtrados.length > visibles.length && (
            <div className="pag-mas">
              <button type="button" onClick={() => setTanda(tanda + POR_TANDA)}>
                Mostrar más
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}