import { Link } from "react-router-dom";
import "./OrigenDatos.css";

// Paso 130: aviso del origen de los datos (Ley 19.628, actualizada por la Ley 21.719).
// Los remates se leen de una fuente pública y se muestran tal como los publica; lo que agrega HouseGreen
// (semáforo, precio de mercado de la comuna con PropiedadesYa) es un análisis propio. Va en el catálogo (corto) y en cada ficha (completo).
// Si cambia este texto, hay que cambiarlo también en la app (compartido/origen-datos.component).

export function OrigenDatos({ corto = false, urlOriginal = null }: { corto?: boolean; urlOriginal?: string | null }) {
  return (
    <aside className={`origen ${corto ? "is-corto" : ""}`} aria-labelledby="origen-titulo">
      <svg className="origen-icono" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="currentColor" />
        <circle cx="12" cy="7.2" r="1.4" fill="#ffffff" />
        <rect x="10.9" y="10" width="2.2" height="7.5" rx="1.1" fill="#ffffff" />
      </svg>
      <div className="origen-texto">
        <h2 id="origen-titulo">Origen de la información</h2>
        {corto ? (
          <p>
            Los remates de este catálogo se obtienen cada día de las publicaciones públicas del sitio{" "}
            <strong>Remates Inmobiliarios</strong> (rematesinmobiliarios.cl) y se muestran tal como aparecen allí, sin
            modificarlos. El semáforo y la comparación con el precio de mercado de cada comuna, que calculamos con los
            avisos en venta de <strong>PropiedadesYa</strong>, son un análisis propio de HouseGreen.
          </p>
        ) : (
          <>
            <p>
              Los datos de este remate se obtienen de forma automática de una publicación pública del sitio{" "}
              <strong>Remates Inmobiliarios</strong> (rematesinmobiliarios.cl) y se muestran tal como aparecen allí, sin
              modificarlos. Su exactitud es responsabilidad de quien los publica: antes de ofertar, revisa la publicación
              original, donde está el anuncio completo, y las bases del remate en el tribunal.
            </p>
            <p>
              El semáforo y la comparación con el precio de mercado de la comuna, calculado con los avisos en venta de{" "}
              <strong>PropiedadesYa</strong>, son un análisis propio de HouseGreen, con fines orientativos: no son asesoría
              legal ni financiera.
            </p>
          </>
        )}
        <p className="origen-ley">Tratamos estos datos según la Ley 19.628, actualizada por la Ley 21.719.</p>
        <p className="origen-enlaces">
          {urlOriginal && (
            <a href={urlOriginal} target="_blank" rel="noopener noreferrer">
              Ver la publicación original ↗
            </a>
          )}
          <Link to="/privacidad#origen-datos">Más sobre el origen de los datos</Link>
        </p>
      </div>
    </aside>
  );
}
