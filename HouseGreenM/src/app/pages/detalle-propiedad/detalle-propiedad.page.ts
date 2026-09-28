import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

export interface FactorSemaforo {
  nombre: string;
  estadoLabel: string;
  estadoClass: 'favorable' | 'atencion' | 'alto';
  descripcion: string;
  fuente: string;
}

export interface ReglaVeto {
  nombre: string;
  aplica: boolean;
  detalle?: string;
}

export interface CondicionesRemate {
  garantiaMonto: number;
  garantiaPorcentaje: number;
  garantiaDetalle: string;
  precioMinimoDetalle: string;
  pagoSaldo: string;
  inscripcion: string;
}

export interface PropiedadDetalle {
  id: number;
  titulo: string;
  ubicacion: string;
  tribunalRol: string;
  precioMinimo: number;
  valorEstimado: number;
  precioM2: number;
  descuentoPorcentaje: number;
  superficie: string;
  fechaRemate: string;
  diasRestantes: number;
  fechaPublicacion: string;
  modalidad: string;
  imagen: string;
  tipo: string;
  habitaciones: number;
  banos: number;
  piso: number;
  anoConstruccion: number;
  tieneEstacionamiento: boolean;
  descripcion: string;
  rolAvaluo: string;
  fechaActualizacionSemaforo: string;
  riesgoGlobal: 'Bajo' | 'Medio' | 'Alto';
  riesgoClass: 'favorable' | 'atencion' | 'alto';
  resumenFactores: string;
  factores: FactorSemaforo[];
  vetos: ReglaVeto[];
  condiciones: CondicionesRemate;
}

@Component({
  selector: 'app-detalle-propiedad',
  templateUrl: './detalle-propiedad.page.html',
  styleUrls: ['./detalle-propiedad.page.scss'],
  standalone: false
})
export class DetallePropiedadPage {

  private route = inject(ActivatedRoute);

  // Lista mock con las 4 propiedades del catálogo
  propiedadesLista: PropiedadDetalle[] = [
    {
      id: 1,
      titulo: 'Departamento 2D 1B',
      ubicacion: 'SANTIAGO CENTRO CALLE LIRA',
      tribunalRol: '10° Juzgado Civil de Santiago Rol C-4.512-2025',
      precioMinimo: 42000000,
      valorEstimado: 61200000,
      precioM2: 875000,
      descuentoPorcentaje: 31,
      superficie: '48 m²',
      fechaRemate: 'vie 2 oct 10:00',
      diasRestantes: 7,
      fechaPublicacion: 'vie 18 sep 2026',
      modalidad: 'Videoconferencia',
      imagen: 'assets/icon/logo-housegreen.svg',
      tipo: 'Departamento',
      habitaciones: 2,
      banos: 1,
      piso: 8,
      anoConstruccion: 2012,
      tieneEstacionamiento: false,
      descripcion: 'Departamento de 48 m² útiles en piso 8, con 2 dormitorios, 1 baño, cocina cerrada y logia. Edificio de 2012 con conserjería y ascensores, cerca de comercio y transporte público. Se remata en un juicio ejecutivo hipotecario.',
      rolAvaluo: '2345-118',
      fechaActualizacionSemaforo: 'mar 22 sep 2026',
      riesgoGlobal: 'Bajo',
      riesgoClass: 'favorable',
      resumenFactores: '4 factores favorables | 1 en atención | sin vetos',
      factores: [
        {
          nombre: 'Descuento sobre el valor estimado',
          estadoLabel: 'Favorable',
          estadoClass: 'favorable',
          descripcion: 'El mínimo está 31% bajo el valor estimado con 4 ventas comparables de la zona.',
          fuente: 'comparables de mercado, ago-sep 2026'
        },
        {
          nombre: 'Ocupación',
          estadoLabel: 'Favorable',
          estadoClass: 'favorable',
          descripcion: 'Desocupada según el acta del receptor judicial.',
          fuente: 'expediente de la causa, 15 sep 2026'
        },
        {
          nombre: 'Contribuciones',
          estadoLabel: 'Favorable',
          estadoClass: 'favorable',
          descripcion: 'Sin deuda de contribuciones registrada.',
          fuente: 'Tesorería (TGR), 22 sep 2026'
        },
        {
          nombre: 'Hipotecas y gravámenes',
          estadoLabel: 'Favorable',
          estadoClass: 'favorable',
          descripcion: 'Una hipoteca a favor del banco demandante, que se alza con la adjudicación.',
          fuente: 'certificado de gravámenes del CBR'
        },
        {
          nombre: 'Gastos comunes',
          estadoLabel: 'Atención',
          estadoClass: 'atencion',
          descripcion: 'Deuda de $1.250.000 con la comunidad. Normalmente la asume quien se adjudica.',
          fuente: 'administración del edificio, 21 sep 2026'
        }
      ],
      vetos: [
        { nombre: 'Ocupantes sin título', aplica: false },
        { nombre: 'Juicio pendiente sobre el dominio', aplica: false },
        { nombre: 'Contribuciones impagas sobre el 10% del mínimo', aplica: false },
        { nombre: 'Sin recepción final municipal', aplica: false }
      ],
      condiciones: {
        garantiaMonto: 4200000,
        garantiaPorcentaje: 10,
        garantiaDetalle: 'Vale vista a la orden del tribunal.',
        precioMinimoDetalle: 'igual al avalúo fiscal',
        pagoSaldo: 'Dentro de 5 días hábiles desde la subasta',
        inscripcion: 'Hasta las 12:00 del jue 1 oct, según las bases'
      }
    },
    {
      id: 2,
      titulo: 'Departamento 3D 2B',
      ubicacion: 'PROVIDENCIA AV. LOS LEONES',
      tribunalRol: '4° Juzgado Civil de Santiago Rol C-8.910-2024',
      precioMinimo: 85000000,
      valorEstimado: 115000000,
      precioM2: 1133333,
      descuentoPorcentaje: 26,
      superficie: '75 m²',
      fechaRemate: 'mié 14 oct 11:30',
      diasRestantes: 19,
      fechaPublicacion: 'lun 21 sep 2026',
      modalidad: 'Videoconferencia (Teams)',
      imagen: 'assets/icon/logo-housegreen.svg',
      tipo: 'Departamento',
      habitaciones: 3,
      banos: 2,
      piso: 5,
      anoConstruccion: 2008,
      tieneEstacionamiento: true,
      descripcion: 'Amplio departamento residencial en Providencia. Cuenta con 3 dormitorios, 2 baños completos, estacionamiento subterráneo y bodega. Excelente conectividad a pasos de metro y zonas comerciales.',
      rolAvaluo: '5612-44',
      fechaActualizacionSemaforo: 'jue 24 sep 2026',
      riesgoGlobal: 'Medio',
      riesgoClass: 'atencion',
      resumenFactores: '3 factores favorables | 2 en atención | sin vetos',
      factores: [
        {
          nombre: 'Descuento sobre el valor estimado',
          estadoLabel: 'Favorable',
          estadoClass: 'favorable',
          descripcion: 'El precio mínimo está 26% bajo el mercado promedio del sector.',
          fuente: 'comparables de mercado, sep 2026'
        },
        {
          nombre: 'Ocupación',
          estadoLabel: 'Atención',
          estadoClass: 'atencion',
          descripcion: 'Ocupada por el arrendatario actual con contrato vencido.',
          fuente: 'expediente de la causa, 10 sep 2026'
        },
        {
          nombre: 'Contribuciones',
          estadoLabel: 'Favorable',
          estadoClass: 'favorable',
          descripcion: 'Al día en pago de contribuciones.',
          fuente: 'Tesorería (TGR), 20 sep 2026'
        },
        {
          nombre: 'Hipotecas y gravámenes',
          estadoLabel: 'Favorable',
          estadoClass: 'favorable',
          descripcion: 'Se alzan dos hipotecas tras la subasta.',
          fuente: 'certificado CBR'
        },
        {
          nombre: 'Gastos comunes',
          estadoLabel: 'Atención',
          estadoClass: 'atencion',
          descripcion: 'Deuda pendiente de $890.000.',
          fuente: 'administración, sep 2026'
        }
      ],
      vetos: [
        { nombre: 'Ocupantes sin título', aplica: false },
        { nombre: 'Juicio pendiente sobre el dominio', aplica: false },
        { nombre: 'Contribuciones impagas sobre el 10% del mínimo', aplica: false },
        { nombre: 'Sin recepción final municipal', aplica: false }
      ],
      condiciones: {
        garantiaMonto: 8500000,
        garantiaPorcentaje: 10,
        garantiaDetalle: 'Vale vista o depósito en la cuenta corriente del tribunal.',
        precioMinimoDetalle: 'establecido según tasación pericial',
        pagoSaldo: 'Dentro de 3 días hábiles contados desde la subasta',
        inscripcion: 'Hasta las 15:00 del lun 12 oct'
      }
    },
    {
      id: 3,
      titulo: 'Casa 4D 3B',
      ubicacion: 'LAS CONDES AV. APOQUINDO',
      tribunalRol: '1° Juzgado Civil de Santiago Rol C-1.234-2025',
      precioMinimo: 160000000,
      valorEstimado: 230000000,
      precioM2: 1142857,
      descuentoPorcentaje: 30,
      superficie: '140 m²',
      fechaRemate: 'mar 20 oct 12:00',
      diasRestantes: 25,
      fechaPublicacion: 'jue 24 sep 2026',
      modalidad: 'Presencial / Tribunal',
      imagen: 'assets/icon/logo-housegreen.svg',
      tipo: 'Casa',
      habitaciones: 4,
      banos: 3,
      piso: 1,
      anoConstruccion: 1998,
      tieneEstacionamiento: true,
      descripcion: 'Casa aislada de dos pisos en comuna de Las Condes. Terreno amplio, patio posterior y antejardín. Presenta observación legal crítica en expediente por litigio de dominio pendiente.',
      rolAvaluo: '8910-12',
      fechaActualizacionSemaforo: 'vie 25 sep 2026',
      riesgoGlobal: 'Alto',
      riesgoClass: 'alto',
      resumenFactores: '2 factores favorables | 1 en atención | 1 regla de veto activada',
      factores: [
        {
          nombre: 'Descuento sobre el valor estimado',
          estadoLabel: 'Favorable',
          estadoClass: 'favorable',
          descripcion: '30% por debajo de las transacciones recientes de la calle.',
          fuente: 'comparables de mercado, sep 2026'
        },
        {
          nombre: 'Ocupación',
          estadoLabel: 'Atención',
          estadoClass: 'atencion',
          descripcion: 'Inmueble actualmente ocupado por ex-propietario.',
          fuente: 'informe receptor, sep 2026'
        },
        {
          nombre: 'Contribuciones',
          estadoLabel: 'Favorable',
          estadoClass: 'favorable',
          descripcion: 'Sin deuda vigente.',
          fuente: 'Tesorería (TGR), sep 2026'
        }
      ],
      vetos: [
        { nombre: 'Ocupantes sin título', aplica: false },
        { nombre: 'Juicio pendiente sobre el dominio', aplica: true, detalle: 'Tercería de dominio activa en tramitación' },
        { nombre: 'Contribuciones impagas sobre el 10% del mínimo', aplica: false },
        { nombre: 'Sin recepción final municipal', aplica: false }
      ],
      condiciones: {
        garantiaMonto: 16000000,
        garantiaPorcentaje: 10,
        garantiaDetalle: 'Vale vista a la orden del 1° Juzgado Civil de Santiago.',
        precioMinimoDetalle: 'mínimo fijado por acuerdo de las partes',
        pagoSaldo: 'Dentro de 5 días hábiles siguientes al remate',
        inscripcion: 'Hasta el venidero vie 16 oct a las 12:00'
      }
    },
    {
      id: 4,
titulo: 'Terreno Urbano Maipú',
  ubicacion: 'MAIPÚ AV. PAJARITOS',
  tribunalRol: '2° Juzgado Civil de Santiago Rol C-6.789-2025',
  precioMinimo: 35000000,
  valorEstimado: 50000000,
  precioM2: 140000,
  descuentoPorcentaje: 30,
  superficie: '250 m²',
  fechaRemate: 'mié 4 nov 11:00',
  diasRestantes: 40,
  fechaPublicacion: 'dom 27 sep 2026',
  modalidad: 'Videoconferencia',
  imagen: 'assets/icon/logo-housegreen.svg',
  tipo: 'Terreno',
  habitaciones: 0,
  banos: 0,
  piso: 0,
  anoConstruccion: 0,
  tieneEstacionamiento: false,
  descripcion: 'Terreno urbano habitacional y comercial de 250 m² ubicado sobre eje principal en la comuna de Maipú. Cuenta con factibilidad de agua potable, alcantarillado y empalme eléctrico. Se remata en juicio ejecutivo hipotecario.',
  rolAvaluo: '4123-55',
  fechaActualizacionSemaforo: 'dom 27 sep 2026',
  riesgoGlobal: 'Bajo',
  riesgoClass: 'favorable',
  resumenFactores: '4 factores favorables | 0 en atención | sin vetos',
  factores: [
    {
      nombre: 'Descuento sobre el valor estimado',
      estadoLabel: 'Favorable',
      estadoClass: 'favorable',
      descripcion: 'El precio mínimo está 30% por debajo del valor comercial estimado según 3 comparables del sector.',
      fuente: 'comparables de mercado en Maipú, sep 2026'
    },
    {
      nombre: 'Ocupación',
      estadoLabel: 'Favorable',
      estadoClass: 'favorable',
      descripcion: 'Sitio eriazo, desocupado y totalmente cercado.',
      fuente: 'expediente de la causa y receptor judicial, sep 2026'
    },
    {
      nombre: 'Contribuciones',
      estadoLabel: 'Favorable',
      estadoClass: 'favorable',
      descripcion: 'Sin deuda vigente de contribuciones.',
      fuente: 'Tesorería General de la República (TGR), sep 2026'
    },
    {
      nombre: 'Urbanización y Servicios',
      estadoLabel: 'Favorable',
      estadoClass: 'favorable',
      descripcion: 'Factibilidad aprobada para recepción de servicios básicos.',
      fuente: 'certificados municipales, 2026'
    }
  ],
  vetos: [
    { nombre: 'Ocupantes sin título', aplica: false },
    { nombre: 'Juicio pendiente sobre el dominio', aplica: false },
    { nombre: 'Contribuciones impagas sobre el 10% del mínimo', aplica: false },
    { nombre: 'Sin recepción final municipal', aplica: false }
  ],
  condiciones: {
    garantiaMonto: 3500000,
    garantiaPorcentaje: 10,
    garantiaDetalle: 'Vale vista a la orden del 2° Juzgado Civil.',
    precioMinimoDetalle: 'igual al avalúo fiscal vigente',
    pagoSaldo: 'Dentro de 5 días hábiles contados desde el remate',
    inscripcion: 'Hasta las 12:00 del lun 2 nov'
  }
}
  ];

  propiedad?: PropiedadDetalle;

  constructor() {
    // Lee el ID enviado por parámetro o selecciona por defecto la primera propiedad (ID 1)
    const idParam = this.route.snapshot.paramMap.get('id');
    const idBuscado = idParam ? parseInt(idParam, 10) : 1;
    this.propiedad = this.propiedadesLista.find(p => p.id === idBuscado) || this.propiedadesLista[0];
  }

  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined || isNaN(valor)) return '$0';
    return '$' + valor.toLocaleString('es-CL');
  }

  abrirEnlace(tipo: 'tgr' | 'sii') {
    if (tipo === 'tgr') {
      window.open('https://www.tgr.cl', '_blank');
    } else {
      window.open('https://www.sii.cl', '_blank');
    }
  }
}