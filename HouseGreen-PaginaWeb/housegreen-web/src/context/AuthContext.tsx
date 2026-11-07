import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api, guardarToken, borrarToken, obtenerToken, ErrorDeApi } from "../api/client";

// id del rol administrador en la tabla roles (el mismo que revisa requerir_admin en la API)
const ROL_ADMIN_ID = 3;
// Paso 110: el analista puede ver los reportes
const ROL_ANALISTA_ID = 2;

// Lo que responde GET /auth/me
export interface UsuarioActual {
  id: string;
  email: string;
  full_name: string;
  role_id: number;
  phone: string | null;
  role_name: string | null;
  two_fa_enabled: boolean; // paso 76: si tiene activada la verificación en dos pasos
  two_fa_required: boolean;
  premium_until: string | null; // paso 122a: hasta cuándo tiene el plan Premium
  acceso_completo: boolean; // paso 122a: si puede ver el detalle (Premium vigente, analista o administrador)
}

interface AuthContextType {
  usuario: UsuarioActual | null;
  estaLogueado: boolean;
  esAdmin: boolean;
  esAnalista: boolean; // paso 110
  verificandoSesion: boolean; // true mientras se revisa un token guardado al abrir la página
  cargando: boolean;
  // Paso 78: devuelve true si entró, o false si la cuenta tiene verificación en dos pasos
  // y todavía falta el código (hay que volver a llamar con el código)
  iniciarSesion: (email: string, password: string, codigo?: string) => Promise<boolean>;
  cerrarSesion: () => void;
  actualizarUsuario: (datos: UsuarioActual) => void; // paso 74: después de editar el perfil
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null);
  const [verificandoSesion, setVerificandoSesion] = useState(obtenerToken() !== null);
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate(); // paso 122d: para ir al inicio de sesión al cerrar sesión

  // Si había un token guardado de una sesión anterior, le preguntamos a la API
  // quién es. Si el token venció, la API responde 401 y partimos sin sesión.
  useEffect(() => {
    if (!obtenerToken()) return;
    api
      .get("/auth/me")
      .then((datos: UsuarioActual) => setUsuario(datos))
      // Paso 125b: el token se borra SOLO si la API dice que no sirve (401 = venció, 403 = cuenta deshabilitada).
      // Si la API no respondió (apagada o sin internet), se conserva: al recargar con la API encendida, la sesión sigue.
      .catch((error) => {
        if (error instanceof ErrorDeApi && (error.status === 401 || error.status === 403)) borrarToken();
      })
      .finally(() => setVerificandoSesion(false));
  }, []);

  async function iniciarSesion(email: string, password: string, codigo?: string) {
    setCargando(true);
    try {
      // 1. POST /auth/login entrega el token
      const respuesta = await api.post("/auth/login", { email, password, code: codigo ?? null });
      // Paso 78: la contraseña está bien, pero la cuenta pide el código de la aplicación
      if (respuesta.requires_2fa) return false;
      guardarToken(respuesta.access_token);
      // 2. GET /auth/me dice quién es y qué rol tiene
      const datos: UsuarioActual = await api.get("/auth/me");
      setUsuario(datos);
      return true;
    } catch (err) {
      borrarToken();
      throw err; // LoginPage muestra el mensaje de error
    } finally {
      setCargando(false);
    }
  }

  // Paso 122d: al cerrar sesión siempre se va al inicio de sesión. Antes eso pasaba solo porque
  // todas las páginas pedían cuenta; desde el paso 122c el catálogo y el plan se ven sin cuenta,
  // y la persona se quedaba ahí como invitado.
  function cerrarSesion() {
    borrarToken();
    setUsuario(null);
    navigate("/login", { replace: true });
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        estaLogueado: usuario !== null,
        esAdmin: usuario?.role_id === ROL_ADMIN_ID,
        esAnalista: usuario?.role_id === ROL_ANALISTA_ID,
        verificandoSesion,
        cargando,
        iniciarSesion,
        cerrarSesion,
        actualizarUsuario: setUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>");
  }
  return context;
}