import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { FotoPublicacion } from "./FotoPublicacion";
import { estadoPublicacion, nombreComuna, plural, textoZona, type PublicacionAdmin } from "./publicacion";
import "./AdminPublicacionDetallePage.css";

// Lo que devuelve GET /admin/publicaciones/{id} (paso 17)
interface PersonaQueLaVio {
  user_id: string;
  full_name: string;
  email: string;
  visitas: number;
  ultima_visita: string;
  la_guardo: boolean;
}

interface PersonaQueLaGuardo {
  user_id: string;
  full_name: string;
  email: string;
  guardada_el: string;
  visitas: number;
}

interface PublicacionDetalle extends PublicacionAdmin {
  description: string | null; // paso 112: la descripción que escribió el admin
  la_vieron: PersonaQueLaVio[];
  la_guardaron: PersonaQueLaGuardo[];
}

type Pestana = "vieron" | "guardaron";

// "José Pizarro" -> "JP"
function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join("");
}

// "hoy 09:42", "ayer 22:05" o "mié, 23 sept"
function formatearFecha(iso: string) {
  const fecha = new Date(iso);
  const hora = fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
  const hoy = new Date();
  const soloDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diasAtras = Math.round((soloDia(hoy) - soloDia(fecha)) / 86_400_000);
  if (diasAtras === 0) return `hoy ${hora}`;
  if (diasAtras === 1) return `ayer ${hora}`;
  return fecha.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
}

// Paso 113: "7 de octubre de 2026, 13:00" (sin la hora si es 00:00, que significa "hora no informada")
function fechaDelRemate(iso: string) {
  const fecha = new Date(iso);
  const dia = fecha.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
  if (fecha.getHours() === 0 && fecha.getMinutes() === 0) return dia;
  return `${dia}, ${fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

const LARGO_MAXIMO_DEL_MOTIVO = 300;

export function AdminPublicacionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [detalle, setDetalle] = useState<PublicacionDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>("vieron");

  // Paso 114: quitar del catálogo (con motivo) y volver a publicar
  const [quitando, setQuitando] = useState(false); // se está mostrando el formulario
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  async function quitar() {
    setGuardando(true);
    setErrorAccion(null);
    try {
      const nuevo: { removed_at: string | null } = await api.post(`/admin/publicaciones/${id}/quitar`, {
        motivo: motivo.trim(),
      });
      setDetalle((actual) => (actual ? { ...actual, removed_at: nuevo.removed_at } : actual));
      setQuitando(false);
      setMotivo("");
    } catch (e) {
      setErrorAccion((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function volverAPublicar() {
    setGuardando(true);
    setErrorAccion(null);
    try {
      await api.post(`/admin/publicaciones/${id}/volver-a-publicar`);
      setDetalle((actual) => (actual ? { ...actual, removed_at: null } : actual));
    } catch (e) {
      setErrorAccion((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  useEffect(() => {
    api
      .get(`/admin/publicaciones/${id}`)
      .then((datos: PublicacionDetalle) => setDetalle(datos))
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const volver = (
    <Link to="/admin/publicaciones" className="det-volver">
      ‹ Publicaciones
    </Link>
  );

  if (error) {
    return (
      <section>
        {volver}
        <p className="pub-error">No se pudo cargar la publicación: {error}</p>
      </section>
    );
  }

  if (!detalle) {
    return (
      <section>
        {volver}
        <p className="admin-subtitulo">Cargando publicación...</p>
      </section>
    );
  }

  // Paso 113: si el remate ya se realizó o se retiró, no aparece en el catálogo y no se edita
  const estado = estadoPublicacion(detalle);

  return (
    <section>
      <div className="det-arriba">
        {volver}
        {estado === "vigente" && (
          <Link to={`/admin/publicaciones/${id}/editar`} className="det-editar">
            ✎ Editar
          </Link>
        )}
      </div>

      {/* Paso 114: la quitó el admin. Se puede volver a publicar. */}
      {estado === "quitada" && detalle.removed_at && (
        <div className="det-aviso-estado is-quitada" role="status">
          <p>
            <strong>Quitaste esta publicación del catálogo el {fechaDelRemate(detalle.removed_at)}.</strong> Los
            inversionistas ya no la ven, pero se guarda con todo su historial. El motivo quedó en el Registro de
            actividad.
          </p>
          <button type="button" className="det-boton" disabled={guardando} onClick={volverAPublicar}>
            {guardando ? "Publicando..." : "Volver a publicar"}
          </button>
          {errorAccion && <p className="det-error-accion">{errorAccion}</p>}
        </div>
      )}

      {(estado === "finalizada" || estado === "retirada") && (
        <p className="det-aviso-estado" role="status">
          <strong>
            {estado === "retirada"
              ? "El sitio de origen retiró este remate."
              : `Este remate ya se realizó${detalle.auction_date ? ` el ${fechaDelRemate(detalle.auction_date)}` : ""}.`}
          </strong>{" "}
          Ya no aparece en el catálogo y se guarda solo como registro, por eso no se puede editar.
        </p>
      )}

      <div className="det-foto-caja">
        <FotoPublicacion url={detalle.image_url} alt={detalle.title} className="det-foto" />
        <span className={`pub-zona pub-zona-${detalle.result_level ?? "sin"} det-zona`}>
          <span className="pub-zona-punto" />
          {textoZona(detalle)}
        </span>
      </div>

      <h1 className="admin-titulo det-titulo">{detalle.title}</h1>
      <p className="admin-subtitulo">
        {nombreComuna(detalle)} · {detalle.property_type}
      </p>
      {/* Paso 114: dirección y fecha del remate, para distinguirla de otras con el mismo título */}
      <p className="det-datos-remate">
        {detalle.address ?? "Sin dirección informada"} ·{" "}
        {detalle.auction_date ? `Remate: ${fechaDelRemate(detalle.auction_date)}` : "Sin fecha de remate"}
      </p>

      {/* Paso 112: la descripción que ven los inversionistas (se cambia con ✎ Editar) */}
      <div className="det-descripcion">
        <p className="det-descripcion-titulo">Descripción</p>
        {detalle.description ? (
          <p className="det-descripcion-texto">{detalle.description}</p>
        ) : (
          <p className="det-descripcion-vacia">
            {estado === "vigente" ? "Sin descripción. Puedes agregar una con ✎ Editar." : "Sin descripción."}
          </p>
        )}
      </div>

      {/* Resumen: personas que la vieron (con vistas totales) y personas que la guardaron */}
      <div className="det-cifras">
        <div className="det-cifra">
          <strong>{detalle.personas}</strong>
          <span>{detalle.personas === 1 ? "persona la vio" : "personas la vieron"}</span>
          <span className="det-cifra-extra">{plural(detalle.vistas, "vista", "vistas")} en total</span>
        </div>
        <div className="det-cifra">
          <strong>{detalle.guardados}</strong>
          <span>{detalle.guardados === 1 ? "persona la guardó" : "personas la guardaron"}</span>
        </div>
      </div>

      {/* Pestañas */}
      <div className="det-pestanas" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "vieron"}
          className={`det-pestana ${pestana === "vieron" ? "is-activa" : ""}`}
          onClick={() => setPestana("vieron")}
        >
          La vieron · {detalle.la_vieron.length}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "guardaron"}
          className={`det-pestana ${pestana === "guardaron" ? "is-activa" : ""}`}
          onClick={() => setPestana("guardaron")}
        >
          La guardaron · {detalle.la_guardaron.length}
        </button>
      </div>

      {pestana === "vieron" && (
        <ul className="det-personas">
          {detalle.la_vieron.length === 0 && <li className="det-vacio">Todavía nadie la ha visto.</li>}
          {detalle.la_vieron.map((p) => (
            <li key={p.user_id} className="det-persona">
              <span className="det-avatar">{iniciales(p.full_name)}</span>
              <div className="det-persona-datos">
                <strong>{p.full_name}</strong>
                <span className="det-correo">{p.email}</span>
                <span>
                  {formatearFecha(p.ultima_visita)} · {plural(p.visitas, "visita", "visitas")}
                </span>
              </div>
              {p.la_guardo && <span className="det-etiqueta">La guardó</span>}
            </li>
          ))}
        </ul>
      )}

      {pestana === "guardaron" && (
        <ul className="det-personas">
          {detalle.la_guardaron.length === 0 && <li className="det-vacio">Nadie la ha guardado todavía.</li>}
          {detalle.la_guardaron.map((p) => (
            <li key={p.user_id} className="det-persona">
              <span className="det-avatar">{iniciales(p.full_name)}</span>
              <div className="det-persona-datos">
                <strong>{p.full_name}</strong>
                <span className="det-correo">{p.email}</span>
                <span>
                  La guardó {formatearFecha(p.guardada_el)} · {plural(p.visitas, "visita", "visitas")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Paso 114: sacarla del catálogo (por ejemplo, una propiedad de prueba). No se borra. */}
      {estado !== "quitada" && (
        <div className="det-quitar">
          {!quitando ? (
            <>
              <p>
                ¿Esta publicación no debería estar en HouseGreen (por ejemplo, es de prueba)? Puedes quitarla del
                catálogo. No se borra: queda guardada con su historial y se puede volver a publicar.
              </p>
              <button type="button" className="det-boton is-peligro-suave" onClick={() => setQuitando(true)}>
                Quitar del catálogo
              </button>
            </>
          ) : (
            <>
              <label htmlFor="det-motivo">¿Por qué la quitas?</label>
              <textarea
                id="det-motivo"
                rows={2}
                maxLength={LARGO_MAXIMO_DEL_MOTIVO}
                placeholder="Por ejemplo: propiedad de prueba"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <div className="det-quitar-botones">
                <button
                  type="button"
                  className="det-boton is-peligro"
                  disabled={guardando || motivo.trim().length < 3}
                  onClick={quitar}
                >
                  {guardando ? "Quitando..." : "Sí, quitar del catálogo"}
                </button>
                <button
                  type="button"
                  className="det-boton"
                  disabled={guardando}
                  onClick={() => {
                    setQuitando(false);
                    setErrorAccion(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
          {errorAccion && <p className="det-error-accion">{errorAccion}</p>}
        </div>
      )}
    </section>
  );
}