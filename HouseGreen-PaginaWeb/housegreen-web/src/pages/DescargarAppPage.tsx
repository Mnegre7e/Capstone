import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./DescargarAppPage.css";

// Paso A16: "Descarga la app" (solo en la página web; se entra desde el pie de página, con o sin cuenta).
// La API dice si hay una app publicada y dónde se descarga (GET /descargas/android). La publica
// "npm run android:apk" en la carpeta HouseGreenM.

interface AppAndroid {
  disponible: boolean;
  url: string | null;
  tamano: number | null;
  actualizada: string | null;
  red_local: boolean;
}

const PASOS = [
  "Escanea el código con la cámara del celular, o abre esta página en el celular y toca Descargar.",
  // Paso A20: el nombre lleva la fecha, así no se confunde con una descarga anterior
  "Abre la descarga más nueva: HouseGreen con la fecha y hora en el nombre (por ejemplo, HouseGreen-20261109-1940.apk).",
  "Si el celular lo pide, permite instalar apps de esta fuente y vuelve atrás.",
  "Toca Instalar. Si aparece Play Protect, toca Más detalles e Instalar de todas formas: la app todavía no está en Google Play.",
  "Abre HouseGreen y entra con tu misma cuenta de la página.",
];

function megas(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function fecha(fechaIso: string) {
  return new Date(fechaIso).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

function Semaforo() {
  return (
    <svg className="descarga-logo" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0f3d30" />
      <circle cx="32" cy="15" r="7.5" fill="#ef4444" />
      <circle cx="32" cy="32" r="7.5" fill="#facc15" />
      <circle cx="32" cy="49" r="7.5" fill="#22c55e" />
    </svg>
  );
}

export function DescargarAppPage() {
  const { esAdmin } = useAuth();
  const [app, setApp] = useState<AppAndroid | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    api
      .get("/descargas/android")
      .then((datos: AppAndroid) => vigente && setApp(datos))
      .catch((err) => vigente && setError(err instanceof Error ? err.message : "Error desconocido"));
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <article className="descarga">
      <header className="descarga-cabecera">
        <Semaforo />
        <h1>HouseGreen en tu celular</h1>
        <p>
          Descarga la app para Android: los mismos remates, el semáforo de riesgo, tus favoritos y tus alertas, con la
          misma cuenta de la página.
        </p>
      </header>

      {error && <p className="descarga-aviso is-error">No se pudo consultar la app: {error}</p>}
      {!error && !app && <p className="descarga-aviso">Cargando...</p>}

      {app && !app.disponible && (
        <section className="descarga-tarjeta descarga-pronto">
          <h2>Muy pronto</h2>
          <p>La app para Android todavía no está publicada. Mientras tanto, puedes usar HouseGreen aquí en la página.</p>
          {esAdmin && (
            <p className="descarga-admin">
              Para publicarla (esto solo lo ves como administrador): en la carpeta HouseGreenM corre{" "}
              <code>npm run android:apk</code> con la API encendida.
            </p>
          )}
        </section>
      )}

      {app?.disponible && app.url && (
        <>
          <div className="descarga-opciones">
            <section className="descarga-celular" aria-labelledby="descarga-celular-titulo">
              <h2 id="descarga-celular-titulo">En el celular</h2>
              <p>Abre esta página en tu celular Android y toca el botón.</p>
              <a className="descarga-boton" href={app.url} download>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Descargar en el celular
              </a>
              <p className="descarga-detalle">
                HouseGreen.apk{app.tamano ? ` · ${megas(app.tamano)}` : ""} · Android 7 o más nuevo
              </p>
              {app.actualizada && <p className="descarga-detalle">Actualizada el {fecha(app.actualizada)}</p>}
            </section>

            <section className="descarga-tarjeta descarga-qr" aria-labelledby="descarga-qr-titulo">
              <h2 id="descarga-qr-titulo">Con un código QR</h2>
              {/* La misma librería del QR de la verificación en dos pasos (Perfil). marginSize: el borde blanco que
                  la cámara necesita para encontrar el código */}
              <QRCodeSVG
                value={app.url}
                size={220}
                level="M"
                marginSize={4}
                fgColor="#0f3d30"
                className="codigo-qr"
                title="Código QR para descargar la app HouseGreen en el celular"
              />
              <p>Escanéalo con la cámara de tu celular Android y se descarga la app.</p>
            </section>
          </div>

          <section className="descarga-tarjeta">
            <h2>Cómo instalarla</h2>
            <ol className="descarga-pasos">
              {PASOS.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ol>
            {app.red_local && (
              <p className="descarga-nota">
                Por ahora HouseGreen funciona desde un computador de esta red: el celular tiene que estar conectado al
                mismo Wi-Fi para descargar y usar la app.
              </p>
            )}
            <p className="descarga-nota">Por ahora la app es solo para Android.</p>
          </section>
        </>
      )}
    </article>
  );
}
