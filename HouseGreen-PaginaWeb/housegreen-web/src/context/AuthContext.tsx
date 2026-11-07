import { createContext, useContext } from "react";

// Paso 125e: aquí quedan los tipos, el contexto y useAuth (los usan muchas pantallas).
// El componente AuthProvider está en AuthProvider.tsx: para que la recarga rápida de Vite funcione,
// un archivo con componentes debe exportar solo componentes (regla react-refresh de ESLint).

// id del rol administrador en la tabla roles (el mismo que revisa requerir_admin en la API)
export const ROL_ADMIN_ID = 3;
// Paso 110: el analista puede ver los reportes
export const ROL_ANALISTA_ID = 2;

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

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>");
  }
  return context;
}