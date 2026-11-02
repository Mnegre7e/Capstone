import { useEffect, useState } from "react";
import { api } from "../../api/client";
import {
  estadoPublicacion,
  nombreComuna,
  plural,
  textoZona,
  type Dominio,
  type PublicacionAdmin,
  type Zona,
} from "./publicacion";
import "./AdminPublicacionesPage.css"; // de aquí sale el distintivo de zona (.pub-zona)
import "./AdminSemaforoPage.css";

// Paso 68: apartado del admin para completar el semáforo.
// Paso 120c: el semáforo ya se calcula solo (la zona de precio, en el paso 120b; el dominio, desde la ficha).
// Este apartado ahora es solo para consultar: cómo quedó cada remate vigente y cuáles no tienen precio de referencia.

type Vista = "comparados" | "sin_referencia";

const POR_TANDA = 20; // cuántas propiedades se muestran de una vez

const ZONA_DE_PRECIO: Record<Zona, string> = {
  verde: "Verde · 2 puntos",
  amarillo: "Amarilla · 1 punto",
  rojo: "Roja · 0 puntos",
};

const DOMINIO: Record<Dominio, string> = {
  exclusivo: "Dominio exclusivo",
  otro: "Otro tipo de dominio",
};

function formatCLP(valor: string | null) {
  if (valor === null) return "Sin precio";
  return Number(valor).toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

// "Remate mar 6 oct · 13:00". Las 00:00 significan "hora no informada" y no se muestran.
function textoRemate(iso: string | null) {
  if (!iso) return "Sin fecha de remate";
  const fecha = new Date(iso);
  // toLocaleDateString entrega "mar, 6 oct": se quita la coma para que quede igual que en el catálogo
  const dia = fecha.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
  if (fecha.getHours() === 0 && fecha.getMinutes() === 0) return `Remate ${dia}`;
  const hora = fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `Remate ${dia} · ${hora}`;
}

// Orden de la lista: primero las que se rematan antes; las que no tienen fecha van al final.
// (Las que ya se remataron no llegan aquí: se sacan antes, paso 70.)
function compararPorRemate(a: PublicacionAdmin, b: PublicacionAdmin) {
  const cuando = (p: PublicacionAdmin) => (p.auction_date ? new Date(p.auction_date).getTime() : Infinity);
  if (cuando(a) === cuando(b)) return 0;
  return cuando(a) < cuando(b) ? -1 : 1;
}

export function AdminSemaforoPage() {
  const [publicaciones, setPublicaciones] = useState<PublicacionAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vista, setVista] = useState<Vista>("comparados");
  const [tanda, setTanda] = useState(POR_TANDA);

  useEffect(() => {
    api
      .get("/admin/publicaciones")
      .then((datos: PublicacionAdmin[]) => setPublicaciones(datos))
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  // Paso 114: solo las que están en el catálogo (sin las rematadas, retiradas ni quitadas por el admin)
  const vigentes = publicaciones.filter((p) => estadoPublicacion(p) === "vigente");
  const finalizadas = publicaciones.length - vigentes.length;

  const totalComparados = vigentes.filter((p) => p.market_zone !== null).length;
  const totalSinReferencia = vigentes.length - totalComparados;

  const enVista = vigentes
    .filter((p) => (vista === "comparados" ? p.market_zone !== null : p.market_zone === null))
    .sort(compararPorRemate);
  const visibles = enVista.slice(0, tanda);

  function cambiarVista(nueva: Vista) {
    setVista(nueva);
    setTanda(POR_TANDA);
  }

  return (
    <section>
      <h1 className="admin-titulo">Semáforo</h1>
      <p className="admin-subtitulo">
        {cargando
          ? "Cargando..."
          : `Se calcula solo, todos los días · ${plural(vigentes.length, "remate vigente", "remates vigentes")}`}
      </p>

      {finalizadas > 0 && (
        <p className="sem-nota">
          {finalizadas === 1
            ? "No se muestra 1 publicación que ya no está en el catálogo."
            : `No se muestran ${finalizadas} publicaciones que ya no están en el catálogo.`}
        </p>
      )}
      {error && <p className="pub-error">No se pudieron cargar las propiedades: {error}</p>}

      <div className="sem-ayuda">
        <p>
          <strong>Cómo se calcula.</strong> Nadie lo completa a mano: la carga automática de cada mañana lo actualiza.
        </p>
        <ul>
          <li>
            <strong>Precio frente a la comuna:</strong> el precio mínimo se compara con el precio típico de los
            departamentos o casas en venta en su comuna (PropiedadesYa). Verde: 40 % o más bajo · Amarilla: entre 15 % y
            39,9 % · Roja: menos de 15 %.
          </li>
          <li>
            <strong>Estado legal:</strong> sale de la ficha del remate.
          </li>
          <li>
            <strong>Dinamismo del barrio y seguridad de la comuna:</strong> salen de los datos de cada comuna.
          </li>
        </ul>
        <p className="sem-ayuda-pie">
          "Sin referencia" son los sitios, parcelas, locales, derechos y otros tipos que no se comparan, o comunas con
          muy pocos avisos: en ellos el precio no suma puntos.
        </p>
      </div>

      <div className="sem-pestanas" role="tablist" aria-label="Remates con precio comparado o sin referencia">
        <button
          type="button"
          role="tab"
          aria-selected={vista === "comparados"}
          className={`sem-pestana ${vista === "comparados" ? "is-activa" : ""}`}
          onClick={() => cambiarVista("comparados")}
        >
          Comparados · {totalComparados}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vista === "sin_referencia"}
          className={`sem-pestana ${vista === "sin_referencia" ? "is-activa" : ""}`}
          onClick={() => cambiarVista("sin_referencia")}
        >
          Sin referencia · {totalSinReferencia}
        </button>
      </div>

      {!cargando && !error && enVista.length === 0 && (
        <p className="sem-vacio">
          {vista === "comparados"
            ? "Ningún remate vigente tiene todavía su precio comparado."
            : "Todos los remates vigentes tienen su precio comparado."}
        </p>
      )}

      <ul className="sem-lista">
        {visibles.map((p) => (
          <li key={p.id} className="sem-item">
            <div className="sem-cabecera">
              <div className="sem-info">
                <h2 className="sem-titulo">{p.title}</h2>
                <p className="sem-meta">
                  {nombreComuna(p)} · {p.property_type} · {textoRemate(p.auction_date)}
                </p>
              </div>
              <span className={`pub-zona pub-zona-${p.result_level ?? "sin"}`}>
                <span className="pub-zona-punto" />
                {textoZona(p)}
              </span>
            </div>

            <p className="sem-precio">
              Precio mínimo <strong>{formatCLP(p.opening_price)}</strong>
              <a href={`/propiedades/${p.id}`} target="_blank" rel="noopener noreferrer">
                Ver detalle ↗
              </a>
            </p>

            {/* Paso 120c: los datos del semáforo se muestran, pero ya no se editan */}
            <dl className="sem-datos">
              <div className="sem-dato">
                <dt>Precio frente a la comuna</dt>
                <dd>
                  <span className={`pub-zona pub-zona-${p.market_zone ?? "sin"}`}>
                    <span className="pub-zona-punto" />
                    {p.market_zone ? ZONA_DE_PRECIO[p.market_zone] : "Sin referencia"}
                  </span>
                </dd>
              </div>
              <div className="sem-dato">
                <dt>Estado legal</dt>
                <dd>{p.domain_type ? DOMINIO[p.domain_type] : "Sin dato en la ficha"}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {enVista.length > visibles.length && (
        <div className="sem-mas">
          <p>
            Mostrando {visibles.length} de {enVista.length}
          </p>
          <button type="button" className="sem-boton-mas" onClick={() => setTanda(tanda + POR_TANDA)}>
            Mostrar {Math.min(POR_TANDA, enVista.length - visibles.length)} más
          </button>
        </div>
      )}
    </section>
  );
}