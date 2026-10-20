import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { dejarAvisoParaElLogin } from "../utils/avisoLogin";

// Paso 105: "Eliminar mi cuenta" (va al final del Perfil).
// La cuenta no se borra: queda suspendida y sus datos se conservan, como pidió la profesora.
// Los administradores no ven esta sección: no pueden eliminar su cuenta desde aquí.
export function EliminarCuenta() {
  const { usuario, esAdmin, cerrarSesion } = useAuth();
  const [abierto, setAbierto] = useState(false); // false = solo se ve el botón; true = el formulario para confirmar
  const [contrasena, setContrasena] = useState("");
  const [codigo, setCodigo] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");

  if (!usuario || esAdmin) return null;
  const pideCodigo = usuario.two_fa_enabled;

  function cancelar() {
    setAbierto(false);
    setContrasena("");
    setCodigo("");
    setError("");
  }

  async function eliminar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (contrasena === "" || (pideCodigo && codigo.trim() === "")) {
      setError(pideCodigo ? "Escribe tu contraseña y el código de tu aplicación." : "Escribe tu contraseña.");
      return;
    }
    setTrabajando(true);
    try {
      await api.post("/auth/me/eliminar", { password: contrasena, code: pideCodigo ? codigo : null });
      // Se cierra la sesión: la página vuelve sola al inicio de sesión, que muestra este aviso
      dejarAvisoParaElLogin("Tu cuenta fue eliminada. Gracias por usar HouseGreen.");
      cerrarSesion();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la cuenta.");
      setTrabajando(false);
    }
  }

  if (!abierto) {
    return (
      <div className="perfil-tarjeta is-peligro">
        <h2>Eliminar mi cuenta</h2>
        <p className="perfil-texto">
          Si eliminas tu cuenta ya no podrás entrar con ella y dejarás de recibir anuncios y avisos de remates.
        </p>
        <button type="button" className="perfil-boton is-peligro" onClick={() => setAbierto(true)}>
          Eliminar mi cuenta
        </button>
      </div>
    );
  }

  return (
    <form className="perfil-tarjeta is-peligro" onSubmit={eliminar}>
      <h2>Eliminar mi cuenta</h2>
      <p className="perfil-texto">¿Seguro? Esto es lo que pasará:</p>
      <ul className="perfil-pasos perfil-consecuencias">
        <li>
          Ya no podrás iniciar sesión con <strong>{usuario.email}</strong>.
        </li>
        <li>Dejarás de recibir anuncios y avisos de remates.</li>
        <li>
          Tus datos se conservan en nuestro registro. Si cambias de opinión, escríbenos a
          housegreen.capstone@gmail.com.
        </li>
      </ul>

      <label className="perfil-campo">
        Contraseña
        <input
          type="password"
          value={contrasena}
          autoComplete="current-password"
          onChange={(e) => setContrasena(e.target.value)}
        />
      </label>

      {pideCodigo && (
        <label className="perfil-campo">
          Código de la aplicación
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="123 456"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/[^\d ]/g, ""))}
          />
        </label>
      )}

      {error && (
        <p className="perfil-aviso is-error" role="alert">
          {error}
        </p>
      )}

      <div className="perfil-botones">
        <button type="submit" className="perfil-boton is-peligro" disabled={trabajando}>
          {trabajando ? "Eliminando..." : "Sí, eliminar mi cuenta"}
        </button>
        <button type="button" className="perfil-boton is-secundario" onClick={cancelar} disabled={trabajando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}