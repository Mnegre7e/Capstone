import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { MarcoDeEntrada } from "../components/MarcoDeEntrada";
import { CampoDeEntrada } from "../components/CampoDeEntrada";
import { problemaDeContrasena, REGLA_CONTRASENA } from "../utils/contrasena";
import { dejarAvisoParaElLogin } from "../utils/avisoLogin";
import "./LoginPage.css"; // los mismos estilos del inicio de sesión

// Paso 117 (RF-03): recuperar la contraseña en dos pasos.
// 1) La persona escribe su correo y le llega un código de 6 dígitos (vale 15 minutos).
// 2) Escribe el código y su contraseña nueva. Después vuelve al inicio de sesión con un aviso.
export function RecuperarPage() {
  const [paso, setPaso] = useState<"correo" | "codigo">("correo");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [mostrar, setMostrar] = useState(false); // el ojo: ver las contraseñas mientras se escriben
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  // Pide el código. Se usa al empezar y con "No me llegó: enviar otro código".
  async function pedirCodigo(otraVez: boolean) {
    setError("");
    setAviso("");
    if (!email.trim().includes("@")) {
      setError("Escribe el correo con el que te registraste.");
      return;
    }
    setEnviando(true);
    try {
      await api.post("/auth/recuperar/pedir", { email: email.trim() });
      setPaso("codigo");
      setCodigo("");
      if (otraVez) setAviso("Te enviamos otro código. Usa siempre el del último correo que te llegó.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el código.");
    } finally {
      setEnviando(false);
    }
  }

  async function cambiarContrasena(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");

    const soloNumeros = codigo.replace(/\s/g, "");
    if (!/^\d{6}$/.test(soloNumeros)) {
      setError("El código tiene 6 dígitos.");
      return;
    }
    const problema = problemaDeContrasena(clave);
    if (problema) {
      setError(problema);
      return;
    }
    if (clave !== repetida) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setEnviando(true);
    try {
      await api.post("/auth/recuperar/cambiar", { email: email.trim(), code: soloNumeros, new_password: clave });
      dejarAvisoParaElLogin("Tu contraseña se cambió. Ya puedes iniciar sesión con la nueva.");
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setEnviando(false);
    }
  }

  function usarOtroCorreo() {
    setPaso("correo");
    setCodigo("");
    setError("");
    setAviso("");
  }

  // ---------- Paso 2: el código y la contraseña nueva ----------
  if (paso === "codigo") {
    return (
      <MarcoDeEntrada>
        {/* key distinta a la del otro formulario: así React lo crea de nuevo y el cursor queda en el código */}
        <form key="codigo" className="login-form" onSubmit={cambiarContrasena} noValidate>
          <h1>Escribe el código</h1>
          
          <p className="login-subtitle">
            Te enviamos un código de 6 dígitos a <strong className="login-correo">{email.trim()}</strong>. Vence en 15
            minutos. Si no lo ves, revisa la carpeta de spam.
          </p>

          {aviso && !error && (
            <p className="login-aviso" role="status">
              {aviso}
            </p>
          )}
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <div className="login-grupo">
            <label className="login-label" htmlFor="codigo-de-recuperacion">
              Código
            </label>
            <div className="login-campo">
              <input
                id="codigo-de-recuperacion"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={7}
                value={codigo}
                // Solo números y espacio (el correo lo muestra como "123 456")
                onChange={(e) => setCodigo(e.target.value.replace(/[^\d ]/g, ""))}
                className="login-input login-codigo"
                placeholder="123 456"
              />
            </div>
          </div>

          <CampoDeEntrada
            etiqueta="Contraseña nueva"
            icono="candado"
            type={mostrar ? "text" : "password"}
            autoComplete="new-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            ayuda={REGLA_CONTRASENA}
            visible={mostrar}
            alCambiarVisible={() => setMostrar(!mostrar)}
          />

          <CampoDeEntrada
            etiqueta="Repite la contraseña nueva"
            icono="candado"
            type={mostrar ? "text" : "password"}
            autoComplete="new-password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            placeholder="Escríbela otra vez"
            visible={mostrar}
            alCambiarVisible={() => setMostrar(!mostrar)}
          />

          <button type="submit" className="login-button" disabled={enviando}>
            {enviando ? "Guardando..." : "Cambiar contraseña"}
          </button>

          <div className="login-recuperar-otras">
            <button type="button" className="login-volver" onClick={() => pedirCodigo(true)} disabled={enviando}>
              No me llegó: enviar otro código
            </button>
            <button type="button" className="login-volver" onClick={usarOtroCorreo} disabled={enviando}>
              Usar otro correo
            </button>
          </div>

          <p className="login-switch">
            <Link to="/login">Volver a iniciar sesión</Link>
          </p>
        </form>
      </MarcoDeEntrada>
    );
  }

  // ---------- Paso 1: el correo ----------
  return (
    <MarcoDeEntrada>
      <form
        key="correo"
        className="login-form"
        onSubmit={(e) => {
          e.preventDefault();
          pedirCodigo(false);
        }}
        noValidate
      >
        <h1>Recuperar contraseña</h1>
        <p className="login-subtitle">
          Escribe el correo de tu cuenta y te enviaremos un código para crear una contraseña nueva.
        </p>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <CampoDeEntrada
          etiqueta="Correo electrónico"
          icono="correo"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
        />

        <button type="submit" className="login-button" disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar código"}
        </button>

        <p className="login-switch login-switch-junto">
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
        </p>
      </form>
    </MarcoDeEntrada>
  );
}