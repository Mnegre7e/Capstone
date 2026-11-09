import { Routes, Route, Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { PropertiesPage } from "./pages/PropertiesPage";
import { PropertyDetailPage } from "./pages/PropertyDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { AlertsPage } from "./pages/AlertsPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminPublicacionesPage } from "./pages/admin/AdminPublicacionesPage";
import { AdminPublicacionDetallePage } from "./pages/admin/AdminPublicacionDetallePage";
import { AdminEditarPublicacionPage } from "./pages/admin/AdminEditarPublicacionPage";
import { AdminSemaforoPage } from "./pages/admin/AdminSemaforoPage";
import { AdminOpinionesPage } from "./pages/admin/AdminOpinionesPage";
import { AdminPanelPage } from "./pages/admin/AdminPanelPage";
import { AdminUsuariosPage } from "./pages/admin/AdminUsuariosPage";
import { AdminAnunciosPage } from "./pages/admin/AdminAnunciosPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { useAlerts } from "./context/AlertsContext";
import { useAnuncios } from "./context/AnunciosContext";
import { RegisterPage } from "./pages/RegisterPage";
import { RecuperarPage } from "./pages/RecuperarPage";
import { PrivacidadPage } from "./pages/PrivacidadPage"; // paso 125c
import { NosotrosPage } from "./pages/NosotrosPage"; // paso 129
import { DescargarAppPage } from "./pages/DescargarAppPage"; // paso A16
import { NotFoundPage } from "./pages/NotFoundPage";
import { PerfilPage } from "./pages/PerfilPage";
import { OpinionesPage } from "./pages/OpinionesPage";
import { AdminAuditoriaPage } from "./pages/admin/AdminAuditoriaPage";
import { AdminCargasPage } from "./pages/admin/AdminCargasPage"; // paso 121
import { AdminPagosPage } from "./pages/admin/AdminPagosPage"; // paso 122e
import { PremiumPage } from "./pages/PremiumPage"; // paso 122b
import { PagoResultadoPage } from "./pages/PagoResultadoPage"; // paso 122d
import { MapaPage } from "./pages/MapaPage"; // paso 124b
import { ReportesLayout } from "./pages/reportes/ReportesLayout";
import { ResumenPage } from "./pages/reportes/ResumenPage";
import { SubastasPage } from "./pages/reportes/SubastasPage";
import { UsuariosPage } from "./pages/reportes/UsuariosPage";
import { AlcancePage } from "./pages/reportes/AlcancePage";
import { FichaRematePage } from "./pages/reportes/FichaRematePage"; // paso 123d
import { FichaPersonaPage } from "./pages/reportes/FichaPersonaPage"; // paso 123d


// Clases de un enlace del menú: el de la sección actual queda marcado
function claseDelEnlace({ isActive }: { isActive: boolean }) {
  return `app-nav-link ${isActive ? "is-activo" : ""}`;
}

function App() {
  const { estaLogueado, esAdmin, esAnalista, cerrarSesion, verificandoSesion } = useAuth();
  const { noLeidas } = useAlerts();
  const { sinLeer } = useAnuncios();
  // Paso 90: el número rojo junto a "Alertas" suma las notificaciones y los anuncios sin leer
  const pendientes = noLeidas + sinLeer;

  // "Remates" queda marcado en el catálogo y también dentro del detalle de una propiedad
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const enRemates = pathname === "/" || pathname.startsWith("/propiedades");

  // Paso 100: en el inicio de sesión y en el registro no se muestra el encabezado.
  // Esas pantallas ya tienen el nombre y el semáforo en su panel verde.
  const enEntrada = pathname === "/login" || pathname === "/registro" || pathname === "/recuperar"; // paso 117

  // Paso 129: la pantalla principal de cada tipo de cuenta (adonde lleva el logo, igual que en la app):
  // inversionista (y sin cuenta) → Remates, analista → Reportes, administrador → Panel
  const inicio = esAnalista ? "/analista" : esAdmin ? "/admin" : "/";
  const enInicio = pathname === inicio;

  // Paso 129: "Volver" vuelve a la pantalla anterior de HouseGreen; si la página se abrió directo
  // (un enlace o al recargar), no hay pantalla anterior y lleva a la principal
  function volver() {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate(inicio);
    }
  }

  // Paso 129: en el celular el menú del admin y del analista queda fijo abajo; el pie deja espacio para él
  const conMenuAbajo = pathname.startsWith("/admin") || pathname.startsWith("/analista");

  return (
    <div>
      {!enEntrada && (
        <header
          className={`app-header ${!esAnalista ? "is-con-menu" : ""} ${!estaLogueado ? "is-invitado" : ""} ${
            !enInicio ? "is-con-volver" : ""
          }`}
        >
          {/* Paso 125b: "is-invitado" achica el encabezado en celular (Premium, Iniciar sesión y Crear cuenta no cabían) */}
          <div className="app-header-izquierda">
            {/* Paso 129: "Volver" en todas las pantallas menos en la principal (igual que en la app) */}
            {!enInicio && (
              <button type="button" className="app-volver" onClick={volver} aria-label="Volver a la pantalla anterior">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="app-volver-texto">Volver</span>
              </button>
            )}
            {/* Paso 129: el logo lleva a la pantalla principal de cada tipo de cuenta (antes del paso 115 iba siempre a Remates) */}
            <Link to={inicio} className="app-logo">
              {/* El mismo dibujo del ícono de la pestaña (public/favicon.svg) */}
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <rect width="64" height="64" rx="14" fill="#0f3d30" />
                <circle cx="32" cy="15" r="7.5" fill="#ef4444" />
                <circle cx="32" cy="32" r="7.5" fill="#facc15" />
                <circle cx="32" cy="49" r="7.5" fill="#22c55e" />
              </svg>
              <span className="app-logo-nombre">HouseGreen</span>
            </Link>
          </div>

          {/* Paso 115: el analista no tiene catálogo, alertas ni perfil: solo puede cerrar sesión.
              Su menú (Resumen · Subastas · Usuarios · Alcance) está en la página de reportes. */}
          {estaLogueado && esAnalista && (
            <div className="app-header-actions">
              <button onClick={cerrarSesion} className="app-logout-btn is-siempre">
                Cerrar sesión
              </button>
            </div>
          )}

          {/* Paso 122c: menú del invitado (sin cuenta): ve los remates y el plan, y puede entrar o crear su cuenta */}
          {!estaLogueado && !verificandoSesion && (
            <nav className="app-header-actions" aria-label="Menú principal">
              <Link to="/" className={`app-nav-link app-nav-inicio ${enRemates ? "is-activo" : ""}`}>
                Remates
              </Link>
              <NavLink to="/premium" className={claseDelEnlace}>
                Premium
              </NavLink>
              <Link to={`/login?volver=${encodeURIComponent(pathname)}`} className="app-nav-link">
                Iniciar sesión
              </Link>
              <Link to={`/registro?volver=${encodeURIComponent(pathname)}`} className="app-cuenta-btn">
                Crear cuenta
              </Link>
            </nav>
          )}

          {estaLogueado && !esAnalista && (
            <nav className="app-header-actions" aria-label="Menú principal">
              <Link to="/" className={`app-nav-link app-nav-inicio ${enRemates ? "is-activo" : ""}`}>
                Remates
              </Link>

              {/* Paso 124b: el mapa (sin Premium muestra el aviso del plan) */}
              <NavLink to="/mapa" className={claseDelEnlace}>
                Mapa
              </NavLink>

              {esAdmin && (
                <NavLink to="/admin" className={claseDelEnlace}>
                  Admin
                </NavLink>
              )}
              <NavLink to="/alertas" className={claseDelEnlace}>
                Alertas{" "}
                {/* Con más de 9 se muestra "9+", para que el número no ensanche el menú */}
                {pendientes > 0 && <span className="app-alerts-badge">{pendientes > 9 ? "9+" : pendientes}</span>}
              </NavLink>
              {/* Paso 82: el administrador ve las opiniones en su panel; el resto las envía desde aquí */}
              {!esAdmin && (
                <NavLink to="/opiniones" className={claseDelEnlace}>
                  Opinar
                </NavLink>
              )}
              <NavLink to="/perfil" className={claseDelEnlace}>
                Perfil
              </NavLink>
              <button onClick={cerrarSesion} className="app-logout-btn">
                Cerrar sesión
              </button>
            </nav>
          )}
        </header>
      )}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/recuperar" element={<RecuperarPage />} /> {/* paso 117 */}
        <Route path="/privacidad" element={<PrivacidadPage />} /> {/* paso 125c: con o sin cuenta */}
        <Route path="/nosotros" element={<NosotrosPage />} /> {/* paso 129: con o sin cuenta, como en la app */}
        <Route path="/app" element={<DescargarAppPage />} /> {/* paso A16: descargar la app (solo en la web) */}

        {/* Paso 122c: el catálogo y el detalle (que sin Premium muestra el aviso del plan) se ven sin cuenta */}
        <Route
          path="/"
          element={
            <ProtectedRoute publica>
              <PropertiesPage />
            </ProtectedRoute>
          }
        />

        {/* Paso 122c: el catálogo y el detalle (que sin Premium muestra el aviso del plan) se ven sin cuenta */}
        <Route
          path="/propiedades/:id"
          element={
            <ProtectedRoute publica>
              <PropertyDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Paso 124b: el mapa de los remates (solo Premium; sin el plan, o sin cuenta, muestra el aviso) */}
        <Route
          path="/mapa"
          element={
            <ProtectedRoute publica>
              <MapaPage />
            </ProtectedRoute>
          }
        />
        
        {/* Paso 122b: el plan Premium (qué incluye y, desde el paso 122d, el pago) */}
        <Route
          path="/premium"
          element={
            <ProtectedRoute publica>
              <PremiumPage />
            </ProtectedRoute>
          }
        />

        {/* Paso 122d: a donde vuelve la persona después de pagar en Webpay */}
        <Route
          path="/premium/resultado"
          element={
            <ProtectedRoute>
              <PagoResultadoPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/alertas"
          element={
            <ProtectedRoute>
              <AlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opiniones"
          element={
            <ProtectedRoute>
              <OpinionesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <PerfilPage />
            </ProtectedRoute>
          }
        />
        {/* Paso 115: la sección del analista, con sus cuatro pantallas */}
        <Route
          path="/analista"
          element={
            <ProtectedRoute soloAnalista>
              <ReportesLayout base="/analista" />
            </ProtectedRoute>
          }
        >
          <Route index element={<ResumenPage />} />
          <Route path="subastas" element={<SubastasPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="alcance" element={<AlcancePage />} />
          {/* Paso 123d: ficha de un remate (desde el buscador) */}
          <Route path="remate/:id" element={<FichaRematePage />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute soloAdmin>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminPanelPage />} />
          <Route path="publicaciones" element={<AdminPublicacionesPage />} />
          <Route path="publicaciones/:id" element={<AdminPublicacionDetallePage />} />
          <Route path="publicaciones/:id/editar" element={<AdminEditarPublicacionPage />} />
          <Route path="semaforo" element={<AdminSemaforoPage />} />
          <Route path="opiniones" element={<AdminOpinionesPage />} />
          <Route path="usuarios" element={<AdminUsuariosPage />} />
          <Route path="anuncios" element={<AdminAnunciosPage />} />

          {/* Paso 115: los mismos reportes del analista, más las personas más activas */}
          <Route path="reportes" element={<ReportesLayout base="/admin/reportes" />}>
            <Route index element={<ResumenPage />} />
            <Route path="subastas" element={<SubastasPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="alcance" element={<AlcancePage />} />
            {/* Paso 123d: fichas del buscador (la de una persona, solo el admin) */}
            <Route path="remate/:id" element={<FichaRematePage />} />
            <Route path="persona/:id" element={<FichaPersonaPage />} />
          </Route>
          
          <Route path="auditoria" element={<AdminAuditoriaPage />} />

          {/* Paso 121: historial de las cargas de remates (se entra desde el Panel) */}
          <Route path="cargas" element={<AdminCargasPage />} />

          {/* Paso 122e: pagos del plan Premium (se entra desde el Panel) */}
          <Route path="pagos" element={<AdminPagosPage />} />

        </Route>

        {/* Cualquier otra dirección: aviso en vez de página en blanco */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Paso 129: pie de página con "Nosotros" (en la app está en el menú) y la política de privacidad.
          Paso A16: y "Descarga la app" (solo en la web: la app no tiene este enlace) */}
      {!enEntrada && (
        <footer className={`app-pie ${conMenuAbajo ? "is-sobre-menu" : ""}`}>
          <span>HouseGreen</span>
          <span aria-hidden="true">·</span>
          <Link to="/app">Descarga la app</Link>
          <span aria-hidden="true">·</span>
          <Link to="/nosotros">Nosotros</Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacidad">Política de privacidad</Link>
        </footer>
      )}
    </div>
  );
}

export default App;