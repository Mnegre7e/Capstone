import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api, guardarToken, borrarToken, obtenerToken, ErrorDeApi } from "../api/client";
import { AuthContext, ROL_ADMIN_ID, ROL_ANALISTA_ID, type UsuarioActual } from "./AuthContext";

// Paso 125e: el proveedor de la sesión, separado de AuthContext.tsx (que exporta el contexto y useAuth).
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