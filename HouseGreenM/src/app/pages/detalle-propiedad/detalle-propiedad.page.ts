import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';

import { ApiService, mensajeDeError } from '../../core/api.service';
import { CatalogoService } from '../../core/catalogo.service';
import { fechaCorta, pesos, remateFinalizado, remateRetirado } from '../../core/remates';
import { SesionService } from '../../core/sesion.service';

// Paso A3: el detalle de un remate, igual que en la web. Sin Premium se ve el aviso del plan.

const NOMBRE_REMATE: Record<string, string> = {
  judicial: 'Judicial',
  extrajudicial: 'Extrajudicial',
  contribuciones: 'Por contribuciones',
  banco: 'Bancario',
};

// Lo que hay que revisar en los sitios oficiales antes de ofertar (en orden: el rol del primero se usa en el segundo)
const VERIFICACIONES = [
  {
    titulo: 'Averigua el rol de la propiedad',
    texto:
      'En el menú Servicios online, entra a «Avalúos y contribuciones de bienes raíces» y busca la propiedad por comuna y dirección. Anota su rol (dos números, por ejemplo 1234-56) y su avalúo fiscal.',
    sitio: 'Impuestos Internos (SII)',
    url: 'https://www.sii.cl/',
  },
  {
    titulo: 'Revisa si debe contribuciones',
    texto:
      'Con la comuna y el rol, pide el certificado de deuda de contribuciones. Esa deuda sigue a la propiedad, no al dueño anterior.',
    sitio: 'Tesorería (TGR)',
    url: 'https://tgr.gob.cl/',
  },
  {
    titulo: 'Pide los certificados de la propiedad',
    texto:
      'Son dos: dominio vigente (quién es el dueño) e hipotecas, gravámenes y prohibiciones (qué deudas o embargos tiene). Se piden con la foja, el número y el año de la inscripción, que aparecen en el anuncio del remate (más arriba, en Datos del remate). Tienen costo.',
    sitio: 'Conservador de Bienes Raíces',
    url: 'https://conservadoresdigitales.cl/',
  },
];

function diasHasta(fecha: Date): number {
  const soloDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((soloDia(fecha) - soloDia(new Date())) / 86_400_000);
}

function textoFaltan(dias: number): string {
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
}

@Component({
  selector: 'app-detalle-propiedad',
  templateUrl: './detalle-propiedad.page.html',
  styleUrls: ['./detalle-propiedad.page.scss'],
  standalone: false,
})
export class DetallePropiedadPage {
  private ruta = inject(ActivatedRoute);
  private api = inject(ApiService);
  private catalogo = inject(CatalogoService);
  private sesion = inject(SesionService);
  private avisos = inject(ToastController);

  readonly VERIFICACIONES = VERIFICACIONES;

  private id = signal<string | null>(null);
  private vistaRegistrada: string | null = null;

  readonly cargando = this.catalogo.cargando;
  readonly conPremium = computed(() => this.sesion.usuario()?.acceso_completo ?? false);
  readonly remate = computed(() => this.catalogo.remates().find((r) => r.id === this.id()) ?? null);
  readonly comuna = computed(() => {
    const r = this.remate();
    return r ? (this.catalogo.comunasPorId()[r.comuna_id] ?? 'Comuna desconocida') : '';
  });
  readonly favorito = computed(() => {
    const id = this.id();
    return id !== null && this.catalogo.favoritos().has(id);
  });

  readonly finalizado = computed(() => remateFinalizado(this.remate()?.auction_date ?? null));
  readonly retirado = computed(() => remateRetirado(this.remate()?.status));
  // "lunes 5 de octubre", para el aviso de remate finalizado
  readonly fechaLarga = computed(() => {
    const fecha = this.remate()?.auction_date;
    return fecha
      ? new Date(fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')
      : '';
  });

  // Enlace a Google Maps con la dirección (a las direcciones sin "Chile" se les agrega la comuna y el país)
  readonly urlMapa = computed(() => {
    const r = this.remate();
    if (!r?.address) return null;
    const direccion = r.address.trim().toLowerCase().endsWith('chile') ? r.address : `${r.address}, ${this.comuna()}, Chile`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
  });

  readonly precio = computed(() => pesos(Number(this.remate()?.opening_price ?? 0)));
  readonly precioM2 = computed(() => {
    const r = this.remate();
    const superficie = Number(r?.physical_info?.surface_m2 ?? 0);
    return r && superficie > 0 ? pesos(Math.round(Number(r.opening_price) / superficie)) : null;
  });

  // Datos de la propiedad: solo los que existen (sin casillas vacías)
  readonly datos = computed(() => {
    const r = this.remate();
    const lista: { etiqueta: string; valor: string; aviso?: string; avisoGris?: boolean }[] = [];
    if (!r) return lista;
    if (r.auction_date) {
      const fecha = new Date(r.auction_date);
      const conHora = fecha.getHours() !== 0 || fecha.getMinutes() !== 0;
      const hora = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
      lista.push({
        etiqueta: 'Fecha del remate',
        valor: conHora ? `${fechaCorta(fecha)} · ${hora}` : fechaCorta(fecha),
        aviso: this.retirado() ? 'Retirado' : this.finalizado() ? 'Finalizado' : textoFaltan(diasHasta(fecha)),
        avisoGris: this.retirado() || this.finalizado(),
      });
    }
    lista.push({ etiqueta: 'Publicado', valor: fechaCorta(new Date(r.created_at), true) });
    lista.push({ etiqueta: 'Tipo de propiedad', valor: r.property_type.charAt(0).toUpperCase() + r.property_type.slice(1) });
    lista.push({ etiqueta: 'Tipo de remate', valor: NOMBRE_REMATE[r.auction_type] ?? r.auction_type });
    const fisica = r.physical_info;
    const superficie = fisica?.surface_m2 ? Number(fisica.surface_m2) : null;
    if (superficie !== null) lista.push({ etiqueta: 'Superficie', valor: `${superficie.toLocaleString('es-CL')} m²` });
    if (fisica?.bedrooms) lista.push({ etiqueta: 'Dormitorios', valor: String(fisica.bedrooms) });
    if (fisica?.bathrooms) lista.push({ etiqueta: 'Baños', valor: String(fisica.bathrooms) });
    return lista;
  });

  async ionViewWillEnter() {
    const id = this.ruta.snapshot.paramMap.get('id');
    this.id.set(id);
    // Si se abrió directo (sin pasar por el catálogo), primero se piden los remates
    if (this.catalogo.remates().length === 0) {
      await this.catalogo.recargar();
    }
    // Le avisa a la API que esta persona abrió el remate (solo con Premium; es una estadística)
    if (id && this.conPremium() && this.vistaRegistrada !== id) {
      this.vistaRegistrada = id;
      this.api.post(`/propiedades/${id}/vista`).catch(() => undefined);
    }
  }

  async alternarFavorito() {
    const id = this.id();
    if (!id) return;
    try {
      await this.catalogo.alternarFavorito(id);
    } catch (error) {
      const aviso = await this.avisos.create({ message: mensajeDeError(error), duration: 3000, position: 'bottom' });
      await aviso.present();
    }
  }
}
