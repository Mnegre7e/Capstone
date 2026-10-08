export interface FactorRiesgo {
  nombre: string;
  score: number;
  nivel: 'bajo' | 'medio' | 'alto';
  descripcion: string;
}

export interface Propiedad {
  id: number;
  lote: string;
  comuna: string;
  direccion: string;
  titulo: string;
  tiempoAlCentro: string;
  fechaPublicacion: string;
  precioMinimo: number;
  precioM2Minimo: number;
  precioMercado: number;
  precioM2Mercado: number;
  descuentoEstimado: number;
  superficie: number;
  tribunal: string;
  causa: string;
  fechaRemate: string;
  horaRemate: string;
  modalidad: string;
  puntajeRiesgo: number;
  riesgoGlobal: 'bajo' | 'medio' | 'alto';
  porcentajeGarantia: number;
  montoGarantia: number;
  tipo: 'Departamento' | 'Casa' | 'Oficina' | 'Terreno';
  guardado: boolean;
  dormitorios?: number;
  banos?: number;
  estacionamiento?: boolean;
  bodega?: boolean;
  descripcion: string;
  factoresRiesgo: FactorRiesgo[];
}

export const PROPIEDADES_CATALOGO: Propiedad[] = [
  {
    id: 1,
    lote: '1500',
    comuna: 'Santiago Centro',
    direccion: 'Av. San Martín 512, Depto 402',
    titulo: 'Departamento 2D 1B',
    tiempoAlCentro: '10 min',
    fechaPublicacion: '18 sep 2026',
    precioMinimo: 42000000,
    precioM2Minimo: 875000,
    precioMercado: 79500000,
    precioM2Mercado: 1656250,
    descuentoEstimado: 47.2,
    superficie: 48,
    tribunal: '18° Juzg. Civil Santiago',
    causa: 'C-1234-2023',
    fechaRemate: 'vie 2 oct 2026',
    horaRemate: '10:00 hrs',
    modalidad: 'Videoconferencia',
    puntajeRiesgo: 8,
    riesgoGlobal: 'bajo',
    porcentajeGarantia: 10,
    montoGarantia: 4200000,
    tipo: 'Departamento',
    guardado: true,
    dormitorios: 2,
    banos: 1,
    estacionamiento: false,
    bodega: true,
    descripcion: 'Excelente departamento céntrico con alta demanda de arriendo. Cuenta con 2 dormitorios, 1 baño y bodega en subterráneo.',
    factoresRiesgo: [
      { nombre: 'Jurídico y ocupacional', score: 8, nivel: 'bajo', descripcion: 'Dominio al día en el CBR. Sin litispendencias activas.' },
      { nombre: 'Comercial y mercado', score: 9, nivel: 'bajo', descripcion: 'Alta liquidez y excelente conectividad con red de metro.' },
      { nombre: 'Financiero y costo', score: 8, nivel: 'bajo', descripcion: 'Sin deudas graves de contribuciones ni gastos comunes.' }
    ]
  },
  {
    id: 2,
    lote: '1501',
    comuna: 'Maipú',
    direccion: 'Pasaje El Trébol 1240',
    titulo: 'Casa 3D 2B',
    tiempoAlCentro: '35 min',
    fechaPublicacion: '21 sep 2026',
    precioMinimo: 68500000,
    precioM2Minimo: 744600,
    precioMercado: 110000000,
    precioM2Mercado: 1195652,
    descuentoEstimado: 37.7,
    superficie: 92,
    tribunal: '5° Juzg. Civil Santiago',
    causa: 'C-8821-2024',
    fechaRemate: 'mié 7 oct 2026',
    horaRemate: '12:00 hrs',
    modalidad: 'Videoconferencia',
    puntajeRiesgo: 6,
    riesgoGlobal: 'medio',
    porcentajeGarantia: 10,
    montoGarantia: 6850000,
    tipo: 'Casa',
    guardado: true,
    dormitorios: 3,
    banos: 2,
    estacionamiento: true,
    bodega: false,
    descripcion: 'Amplia casa aislada en barrio residencial consolidado de Maipú. Cuenta con patio interior y antejardín con entrada de auto.',
    factoresRiesgo: [
      { nombre: 'Jurídico y ocupacional', score: 5, nivel: 'medio', descripcion: 'Propiedad actualmente ocupada. Proceso de desalojo estimado en 6 meses.' },
      { nombre: 'Comercial y mercado', score: 7, nivel: 'medio', descripcion: 'Buena demanda familiar en el sector.' },
      { nombre: 'Financiero y costo', score: 6, nivel: 'medio', descripcion: 'Requiere trabajos de pintura y mantención estética menor.' }
    ]
  },
  {
    id: 3,
    lote: '1502',
    comuna: 'Estación Central',
    direccion: 'Av. Ecuador 3800, Depto 1105',
    titulo: 'Departamento 1D 1B',
    tiempoAlCentro: '15 min',
    fechaPublicacion: '22 sep 2026',
    precioMinimo: 31200000,
    precioM2Minimo: 866700,
    precioMercado: 58000000,
    precioM2Mercado: 1611111,
    descuentoEstimado: 46.2,
    superficie: 36,
    tribunal: '2° Juzg. Civil Santiago',
    causa: 'C-4091-2022',
    fechaRemate: 'vie 9 oct 2026',
    horaRemate: '11:30 hrs',
    modalidad: 'Videoconferencia',
    puntajeRiesgo: 4,
    riesgoGlobal: 'alto',
    porcentajeGarantia: 10,
    montoGarantia: 3120000,
    tipo: 'Departamento',
    guardado: false,
    dormitorios: 1,
    banos: 1,
    estacionamiento: false,
    bodega: false,
    descripcion: 'Departamento tipo estudio/1D1B ideal para inversión. Requiere regularización de gastos comunes adeudados.',
    factoresRiesgo: [
      { nombre: 'Jurídico y ocupacional', score: 3, nivel: 'alto', descripcion: 'Múltiples embargos inscritos y deudas acumuladas de GGCC.' },
      { nombre: 'Comercial y mercado', score: 6, nivel: 'medio', descripcion: 'Alta rotación de arriendos en la zona.' },
      { nombre: 'Financiero y costo', score: 3, nivel: 'alto', descripcion: 'Monto retenido alto a descontar en la liquidación del remate.' }
    ]
  },
  {
    id: 4,
    lote: '1503',
    comuna: 'Providencia',
    direccion: 'Av. Providencia 2100, Of. 504',
    titulo: 'Oficina',
    tiempoAlCentro: '12 min',
    fechaPublicacion: 'hoy',
    precioMinimo: 95000000,
    precioM2Minimo: 1484400,
    precioMercado: 155000000,
    precioM2Mercado: 2421875,
    descuentoEstimado: 38.7,
    superficie: 64,
    tribunal: '12° Juzg. Civil Santiago',
    causa: 'C-9012-2024',
    fechaRemate: 'mié 14 oct 2026',
    horaRemate: '09:30 hrs',
    modalidad: 'Videoconferencia',
    puntajeRiesgo: 9,
    riesgoGlobal: 'bajo',
    porcentajeGarantia: 10,
    montoGarantia: 9500000,
    tipo: 'Oficina',
    guardado: true,
    dormitorios: 0,
    banos: 2,
    estacionamiento: true,
    bodega: true,
    descripcion: 'Oficina comercial habilitada en eje estratégico de Providencia, a pasos de Metro Los Leones.',
    factoresRiesgo: [
      { nombre: 'Jurídico y ocupacional', score: 9, nivel: 'bajo', descripcion: 'Oficina desocupada con entrega inmediata tras la firma de escritura.' },
      { nombre: 'Comercial y mercado', score: 9, nivel: 'bajo', descripcion: 'Excelente plusvalía y alto perfil corporativo.' },
      { nombre: 'Financiero y costo', score: 8, nivel: 'bajo', descripcion: 'Cuentas al día y administración de edificio regularizada.' }
    ]
  }
];