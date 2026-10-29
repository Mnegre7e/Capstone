import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import "./AdminAuditoriaPage.css";

// Paso 111: registro de actividad (auditoría). Todo lo que se hace en HouseGreen queda anotado
// en la tabla audit_logs, que no se puede modificar ni borrar. Aquí el administrador lo revisa.

// Lo que trae cada registro de GET /admin/auditoria
interface Registro {
  id: number;
  created_at: string;
  email: string | null;
  nombre: string | null;
  rol: string | null; // inversionista, analista, administrador (vacío: correo no registrado)
  accion: string;
  entidad_tipo: string | null;
  entidad_id: string | null;
  entidad_nombre: string | null;
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
  ip: string | null;
  plataforma: string | null;
}

interface Pagina {
  total: number;
  registros: Registro[];
  hay_mas: boolean;
}

interface Filtros {
  periodo: string;
  rol: string;
  grupo: string;
  buscar: string;
}

const FILTROS_INICIALES: Filtros = { periodo: "30d", rol: "", grupo: "", buscar: "" };

const ROLES = [
  { valor: "", nombre: "Todas" },
  { valor: "inversionista", nombre: "Inversionistas" },
  { valor: "analista", nombre: "Analistas" },
  { valor: "administrador", nombre: "Administradores" },
  { valor: "sin_cuenta", nombre: "Correo no registrado" },
];

const GRUPOS = [
  { valor: "", nombre: "Todo" },
  { valor: "sesiones", nombre: "Inicios de sesión" },
  { valor: "intentos_fallidos", nombre: "Intentos fallidos" },
  { valor: "cuentas", nombre: "Cuentas" },
  { valor: "favoritos_y_alertas", nombre: "Favoritos y alertas" },
  { valor: "opiniones", nombre: "Opiniones" },
  { valor: "publicaciones", nombre: "Publicaciones" },
  { valor: "anuncios", nombre: "Anuncios" },
];

const PERIODOS = [
  { valor: "7d", nombre: "Últimos 7 días" },
  { valor: "30d", nombre: "Últimos 30 días" },
  { valor: "todo", nombre: "Desde el inicio" },
];

const NOMBRE_DEL_ROL: Record<string, string> = {
  inversionista: "Inversionista",
  analista: "Analista",
  administrador: "Administrador",
};

// Por qué no pudo entrar (lo anota la API en "motivo")
const MOTIVOS: Record<string, string> = {
  correo_no_registrado: "el correo no está registrado",
  contrasena_incorrecta: "contraseña incorrecta",
  cuenta_deshabilitada: "la cuenta está suspendida",
  cuenta_eliminada: "la cuenta fue eliminada",
  codigo_incorrecto: "código de dos pasos incorrecto",
  // Paso 117: al pedir un código para recuperar la contraseña
  demasiados_pedidos: "pidió demasiados códigos seguidos (no se envió)",
};

// Nombres de los datos que aparecen en "Ver detalle"
const CAMPOS: Record<string, string> = {
  descripcion: "Descripción",
  full_name: "Nombre",
  phone: "Teléfono",
  zona_de_precio: "Zona de precio",
  dominio: "Dominio",
  nivel: "Semáforo",
  puntos: "Puntos",
  estado: "Estado",
  eliminada_el: "La eliminó el",
  email: "Correo",
  url: "Foto",
  etiqueta: "Etiqueta",
  posicion: "Posición",
  fotos: "Orden de las fotos",
  motivo: "Motivo",
  dos_pasos: "Usa verificación en dos pasos",
  calificacion: "Calificación",
  tema: "Tema",
  acepta_respuesta: "Acepta respuesta",
  titulo: "Título",
  audiencia: "A quiénes",
  destinatarios: "Personas que lo recibieron",
  por_correo: "También por correo",
  intentos: "Intentos con ese código", // paso 117
  max_risk_level: "Nivel máximo",
  max_price: "Precio máximo",
  quitada_el: "La había quitado el",
};

// Datos internos que no le sirven a quien lee el registro (la comuna de una alerta ya va en la frase)
const CAMPOS_OCULTOS = new Set(["foto_id", "respuesta_id", "comuna_id"]);

const ES_FALLO = new Set(["inicio_sesion_fallido", "inicio_sesion_bloqueado", "recuperacion_fallida"]);

// Fecha y hora en Chile
function dia(fechaIso: string) {
  return new Date(fechaIso).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function hora(fechaIso: string) {
  return new Date(fechaIso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function nombreDelDia(fechaIso: string) {
  const fecha = new Date(fechaIso).toDateString();
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (fecha === hoy.toDateString()) return "Hoy";
  if (fecha === ayer.toDateString()) return "Ayer";
  const texto = dia(fechaIso);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Un valor de "antes" o "después", escrito para personas
function textoDelValor(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (campo === "motivo" && typeof valor === "string") return MOTIVOS[valor] ?? valor;
  if (campo === "max_price" && typeof valor === "string") {
    return Number(valor).toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
  }
  if ((campo === "eliminada_el" || campo === "quitada_el") && typeof valor === "string") return `${dia(valor)}, ${hora(valor)}`;
  if (campo === "fotos" && Array.isArray(valor)) {
    return valor
      .map((foto, i) => `${i + 1}. ${(foto as { etiqueta?: string | null }).etiqueta || "sin etiqueta"}`)
      .join(" · ");
  }
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

// Qué hizo, en palabras. "objeto" es el nombre de la propiedad, persona, anuncio, etc.
function frase(registro: Registro, objeto: ReactNode): ReactNode {
  const motivo = registro.despues?.motivo;
  switch (registro.accion) {
    case "registro":
      return "se registró";
    case "inicio_sesion":
      return "inició sesión";
    case "inicio_sesion_fallido":
      return `no pudo iniciar sesión${typeof motivo === "string" ? `: ${MOTIVOS[motivo] ?? motivo}` : ""}`;
    case "inicio_sesion_bloqueado":
      return "quedó bloqueado por demasiados intentos fallidos";
    case "perfil_editado":
      return "editó su perfil";
    case "contrasena_cambiada":
      return "cambió su contraseña";
    case "dos_pasos_activada":
      return "activó la verificación en dos pasos";
    // Paso 117
    case "recuperacion_pedida":
      return `pidió un código para recuperar su contraseña${typeof motivo === "string" ? `: ${MOTIVOS[motivo] ?? motivo}` : ""}`;
    case "recuperacion_fallida":
      return "escribió mal el código para recuperar su contraseña";
    case "contrasena_recuperada":
      return "cambió su contraseña con un código enviado por correo";
    case "dos_pasos_desactivada":
      return "desactivó la verificación en dos pasos";
    case "cuenta_eliminada":
      return "eliminó su cuenta";
    case "cuenta_suspendida":
      return <>suspendió la cuenta de {objeto}</>;
    case "cuenta_reactivada":
      return <>reactivó la cuenta de {objeto}</>;
    case "favorito_agregado":
      return <>guardó en favoritos {objeto}</>;
    case "favorito_quitado":
      return <>quitó de favoritos {objeto}</>;
    case "alerta_creada":
      return <>creó una alerta: {objeto}</>;
    case "alerta_eliminada":
      return <>eliminó una alerta: {objeto}</>;
    case "opinion_enviada":
      return "envió una opinión";
    case "opinion_respondida":
      return <>respondió una opinión de {objeto}</>;
    case "descripcion_editada":
      return <>editó la descripción de {objeto}</>;
    case "foto_subida":
      return <>subió una foto a {objeto}</>;
    case "foto_quitada":
      return <>quitó una foto de {objeto}</>;
    case "fotos_ordenadas":
      return <>ordenó las fotos de {objeto}</>;
    case "semaforo_editado":
      return <>cambió el semáforo de {objeto}</>;
    case "anuncio_enviado":
      return <>envió el anuncio {objeto}</>;
    default:
      return registro.accion.replace(/_/g, " ");
    case "publicacion_quitada":
      return <>quitó del catálogo {objeto}</>;
    case "publicacion_restaurada":
      return <>volvió a publicar {objeto}</>;
  }
}

// El nombre de la propiedad, persona, etc. Las propiedades llevan a su publicación.
function objetoDe(registro: Registro): ReactNode {
  const nombre = registro.entidad_nombre ?? "(ya no existe)";
  if (registro.entidad_tipo === "propiedad" && registro.entidad_id) {
    return <Link to={`/admin/publicaciones/${registro.entidad_id}`}>«{nombre}»</Link>;
  }
  if (registro.entidad_tipo === "anuncio") return <strong>«{nombre}»</strong>;
  return <strong>{nombre}</strong>;
}

// "Ver detalle": lo que había antes y lo que quedó después
function Detalle({ registro }: { registro: Registro }) {
  const antes = registro.antes ?? {};
  const despues = registro.despues ?? {};
  const campos = [...new Set([...Object.keys(antes), ...Object.keys(despues)])].filter(
    (campo) => !CAMPOS_OCULTOS.has(campo) && !(campo === "motivo" && registro.accion === "inicio_sesion_fallido")
  );
  const hayAntes = registro.antes !== null && Object.keys(antes).length > 0;

  if (campos.length === 0 && !registro.ip) return null;

  return (
    <details className="aud-detalle">
      <summary>Ver detalle</summary>
      <dl>
        {campos.map((campo) => (
          <div key={campo}>
            <dt>{CAMPOS[campo] ?? campo}</dt>
            <dd>
              {hayAntes && campo in antes && campo in despues ? (
                <>
                  <span className="aud-antes">{textoDelValor(campo, antes[campo])}</span>
                  <span aria-label="cambió a"> → </span>
                  {textoDelValor(campo, despues[campo])}
                </>
              ) : (
                textoDelValor(campo, campo in despues ? despues[campo] : antes[campo])
              )}
            </dd>
          </div>
        ))}
        {registro.ip && (
          <div>
            <dt>Dirección IP</dt>
            <dd>{registro.ip}</dd>
          </div>
        )}
      </dl>
    </details>
  );
}

function armarRuta(filtros: Filtros, antesDe?: number) {
  const parametros = new URLSearchParams({ periodo: filtros.periodo, limite: "50" });
  if (filtros.rol) parametros.set("rol", filtros.rol);
  if (filtros.grupo) parametros.set("grupo", filtros.grupo);
  if (filtros.buscar) parametros.set("buscar", filtros.buscar);
  if (antesDe !== undefined) parametros.set("antes_de", String(antesDe));
  return `/admin/auditoria?${parametros.toString()}`;
}

export function AdminAuditoriaPage() {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [textoBuscar, setTextoBuscar] = useState("");
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada vez que cambian los filtros se pide la primera página de nuevo
  useEffect(() => {
    let vigente = true; // si cambian los filtros antes de que llegue la respuesta, se ignora la anterior
    api
      .get(armarRuta(filtros))
      .then((datos: Pagina) => {
        if (vigente) {
          setPagina(datos);
          setError(null);
        }
      })
      .catch((err) => vigente && setError(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [filtros]);

  function cambiarFiltro(cambio: Partial<Filtros>) {
    setCargando(true);
    setFiltros((anteriores) => ({ ...anteriores, ...cambio }));
  }

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    const texto = textoBuscar.trim();
    if (texto !== filtros.buscar) cambiarFiltro({ buscar: texto });
  }

  function limpiar() {
    setTextoBuscar("");
    setCargando(true);
    setFiltros(FILTROS_INICIALES);
  }

  // "Cargar más": pide los registros más antiguos que el último que se ve
  async function cargarMas() {
    if (!pagina || pagina.registros.length === 0) return;
    setCargandoMas(true);
    try {
      const ultimo = pagina.registros[pagina.registros.length - 1];
      const mas: Pagina = await api.get(armarRuta(filtros, ultimo.id));
      setPagina({ total: mas.total, registros: [...pagina.registros, ...mas.registros], hay_mas: mas.hay_mas });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCargandoMas(false);
    }
  }

  const hayFiltros =
    filtros.rol !== "" || filtros.grupo !== "" || filtros.buscar !== "" || filtros.periodo !== FILTROS_INICIALES.periodo;

  return (
    <section>
      <Link to="/admin" className="aud-volver">
        ‹ Volver al Panel
      </Link>
      <h1 className="admin-titulo">Registro de actividad</h1>
      <p className="admin-subtitulo">
        Todo lo que se hace en HouseGreen queda anotado aquí. Este registro no se puede modificar ni borrar.
      </p>

      <div className="aud-filtros">
        <form className="aud-buscar" onSubmit={buscar} role="search">
          <label htmlFor="aud-buscar">Persona</label>
          <div className="aud-buscar-fila">
            <input
              id="aud-buscar"
              type="search"
              placeholder="Correo o nombre"
              value={textoBuscar}
              onChange={(e) => setTextoBuscar(e.target.value)}
            />
            <button type="submit">Buscar</button>
          </div>
        </form>
        <label>
          Tipo de cuenta
          <select value={filtros.rol} onChange={(e) => cambiarFiltro({ rol: e.target.value })}>
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Qué
          <select value={filtros.grupo} onChange={(e) => cambiarFiltro({ grupo: e.target.value })}>
            {GRUPOS.map((g) => (
              <option key={g.valor} value={g.valor}>
                {g.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Período
          <select value={filtros.periodo} onChange={(e) => cambiarFiltro({ periodo: e.target.value })}>
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="aud-cuenta">
        {cargando
          ? "Buscando..."
          : pagina &&
            `${pagina.total.toLocaleString("es-CL")} ${pagina.total === 1 ? "registro" : "registros"}` +
              (pagina.total > pagina.registros.length ? ` · se muestran ${pagina.registros.length}` : "")}
        {hayFiltros && !cargando && (
          <button type="button" className="aud-limpiar" onClick={limpiar}>
            Quitar filtros
          </button>
        )}
      </p>

      {error && <p className="aud-error">No se pudo cargar el registro: {error}</p>}

      {pagina && pagina.registros.length === 0 && !cargando && (
        <div className="aud-vacio">No hay registros con esos filtros.</div>
      )}

      {pagina && pagina.registros.length > 0 && (
        <ul className={`aud-lista ${cargando ? "is-cargando" : ""}`}>
          {pagina.registros.map((registro, i) => {
            const diaDeEste = nombreDelDia(registro.created_at);
            const nuevoDia = i === 0 || nombreDelDia(pagina.registros[i - 1].created_at) !== diaDeEste;
            const sinCuenta = registro.rol === null;
            return [
              nuevoDia && (
                <li key={`dia-${registro.id}`} className="aud-dia">
                  {diaDeEste}
                </li>
              ),
              <li key={registro.id} className={`aud-item ${ES_FALLO.has(registro.accion) ? "is-fallo" : ""}`}>
                <span className="aud-hora">{hora(registro.created_at)}</span>
                <div className="aud-contenido">
                  <p className="aud-frase">
                    <strong>{registro.nombre ?? registro.email ?? "Alguien"}</strong> {frase(registro, objetoDe(registro))}
                  </p>
                  <p className="aud-meta">
                    <span className={`aud-chip ${sinCuenta ? "is-sin-cuenta" : ""}`}>
                      {sinCuenta ? "Sin cuenta" : NOMBRE_DEL_ROL[registro.rol ?? ""] ?? registro.rol}
                    </span>
                    {registro.nombre && registro.email && <span>{registro.email}</span>}
                    {registro.plataforma && <span>desde la {registro.plataforma === "app" ? "app" : "web"}</span>}
                  </p>
                  <Detalle registro={registro} />
                </div>
              </li>,
            ];
          })}
        </ul>
      )}

      {pagina?.hay_mas && (
        <div className="aud-mas">
          <button type="button" onClick={cargarMas} disabled={cargandoMas}>
            {cargandoMas ? "Cargando..." : "Cargar más"}
          </button>
        </div>
      )}
    </section>
  );
}