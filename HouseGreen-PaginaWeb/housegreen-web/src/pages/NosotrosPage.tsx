import "./NosotrosPage.css";

// Paso 129: "Nosotros", la misma página que tiene la app (se ve con o sin cuenta; se entra desde el pie de página)

const VALORES = [
  { nombre: "Transparencia", texto: "Información verificada directamente de fuentes oficiales y procesos judiciales." },
  { nombre: "Innovación", texto: "Herramientas avanzadas como el análisis de riesgo por semáforo en tiempo real." },
  { nombre: "Seguridad", texto: "Resguardo y fiabilidad constante en cada uno de los datos presentados." },
];

export function NosotrosPage() {
  return (
    <article className="nos">
      <header className="nos-cabecera">
        {/* El mismo semáforo del logo */}
        <svg className="nos-logo" viewBox="0 0 64 64" aria-hidden="true">
          <rect width="64" height="64" rx="14" fill="#0f3d30" />
          <circle cx="32" cy="15" r="7.5" fill="#ef4444" />
          <circle cx="32" cy="32" r="7.5" fill="#facc15" />
          <circle cx="32" cy="49" r="7.5" fill="#22c55e" />
        </svg>
        <h1>Sobre HouseGreen</h1>
        <p>Plataforma para la evaluación e inversión inteligente en remates inmobiliarios en Chile.</p>
      </header>

      <section className="nos-tarjeta">
        <h2>Nuestra misión</h2>
        <p>
          Democratizar y transparentar el acceso a las oportunidades de remate judicial, brindando herramientas de
          análisis financiero y legal sencillas y precisas.
        </p>
      </section>

      <section className="nos-tarjeta">
        <h2>Nuestros valores</h2>
        <ul className="nos-valores">
          {VALORES.map((valor) => (
            <li key={valor.nombre}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="11" fill="#15803d" />
                <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <h3>{valor.nombre}</h3>
                <p>{valor.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
