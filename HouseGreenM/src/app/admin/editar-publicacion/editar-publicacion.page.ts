import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular/lazy';

import { FotoPublicacion, PublicacionAdmin, nombreComuna } from '../../core/admin';
import { ApiService, mensajeDeError } from '../../core/api.service';
import { pesos } from '../../core/remates';

// Paso A9: editar una publicación, igual que AdminEditarPublicacionPage de la web (antes era de ejemplo).
// Solo se cambian las fotos (subir, borrar, ordenar, portada y etiquetas) y la descripción: los datos del remate
// no se editan. Los cambios se guardan en la API y se ven también en la web.

interface PublicacionEditable extends PublicacionAdmin {
  description: string | null;
  fotos: FotoPublicacion[];
}

const MAX_DESCRIPCION = 1000;
const MAX_FOTOS = 15; // los mismos límites que revisa la API
const MAX_BYTES_FOTO = 5 * 1024 * 1024;
const MAX_ETIQUETA = 40;

/** Para saber si cambió el orden o alguna etiqueta. */
function resumenFotos(fotos: FotoPublicacion[]): string {
  return JSON.stringify(fotos.map((f) => [f.id, f.label ?? '']));
}

@Component({
  selector: 'app-editar-publicacion',
  templateUrl: './editar-publicacion.page.html',
  styleUrls: ['./editar-publicacion.page.scss'],
  standalone: false,
})
export class EditarPublicacionPage {
  private ruta = inject(ActivatedRoute);
  private api = inject(ApiService);
  private alertas = inject(AlertController);

  readonly MAX_DESCRIPCION = MAX_DESCRIPCION;
  readonly MAX_FOTOS = MAX_FOTOS;
  readonly MAX_ETIQUETA = MAX_ETIQUETA;

  readonly id = signal('');
  readonly publicacion = signal<PublicacionEditable | null>(null);
  readonly errorCarga = signal<string | null>(null);

  readonly texto = signal(''); // lo que está escrito en el cuadro
  private original = signal(''); // lo que está guardado en la base
  readonly guardando = signal(false);
  readonly mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  readonly fotos = signal<FotoPublicacion[]>([]);
  private fotosGuardadas = signal<FotoPublicacion[]>([]);
  readonly subiendo = signal<string | null>(null); // "Subiendo 1 de 3..."
  readonly erroresFotos = signal<string[]>([]);
  private portadaFallo = signal(false);

  readonly cambioDescripcion = computed(() => this.texto() !== this.original());
  readonly cambioFotos = computed(() => resumenFotos(this.fotos()) !== resumenFotos(this.fotosGuardadas()));
  readonly ocupado = computed(() => this.guardando() || this.subiendo() !== null);
  readonly comuna = computed(() => {
    const publicacion = this.publicacion();
    return publicacion ? nombreComuna(publicacion) : '';
  });
  readonly precio = computed(() => {
    const valor = this.publicacion()?.opening_price;
    return valor === null || valor === undefined ? 'Sin precio' : pesos(Number(valor));
  });
  // Si ya subieron fotos se muestra la portada; si no, la imagen que traía la publicación
  readonly portada = computed(() => {
    const url = this.fotos()[0]?.url ?? this.publicacion()?.image_url ?? null;
    return url && !this.portadaFallo() ? this.api.urlDeArchivo(url) : null;
  });
  readonly fotosConUrl = computed(() => this.fotos().map((foto) => ({ foto, url: this.api.urlDeArchivo(foto.url) })));

  async ionViewWillEnter() {
    this.id.set(this.ruta.snapshot.paramMap.get('id') ?? '');
    try {
      const datos = await this.api.get<PublicacionEditable>(`/admin/publicaciones/${this.id()}`);
      this.publicacion.set(datos);
      this.texto.set(datos.description ?? '');
      this.original.set(datos.description ?? '');
      this.fotos.set(datos.fotos);
      this.fotosGuardadas.set(datos.fotos);
      this.errorCarga.set(null);
    } catch (error) {
      this.errorCarga.set(mensajeDeError(error));
    }
  }

  escribirDescripcion(valor: string) {
    this.texto.set(valor);
    this.mensaje.set(null);
  }

  async guardar() {
    this.guardando.set(true);
    this.mensaje.set(null);
    try {
      if (this.cambioDescripcion()) {
        const respuesta = await this.api.patch<{ description: string | null }>(
          `/admin/publicaciones/${this.id()}/descripcion`,
          { description: this.texto() },
        );
        const guardada = respuesta.description ?? '';
        this.texto.set(guardada);
        this.original.set(guardada);
      }
      if (this.cambioFotos()) {
        const orden = this.fotos().map((f) => ({ id: f.id, label: f.label }));
        const respuesta = await this.api.put<FotoPublicacion[]>(`/admin/publicaciones/${this.id()}/fotos`, orden);
        this.fotos.set(respuesta);
        this.fotosGuardadas.set(respuesta);
      }
      this.mensaje.set({ tipo: 'ok', texto: 'Cambios guardados.' });
    } catch (error) {
      this.mensaje.set({ tipo: 'error', texto: `No se pudo guardar: ${mensajeDeError(error)}` });
    } finally {
      this.guardando.set(false);
    }
  }

  elegirArchivos(evento: Event) {
    const campo = evento.target as HTMLInputElement;
    const archivos = Array.from(campo.files ?? []);
    campo.value = ''; // permite volver a elegir el mismo archivo
    if (archivos.length > 0) {
      void this.subirFotos(archivos);
    }
  }

  private async subirFotos(archivos: File[]) {
    const errores: string[] = [];
    let cantidad = this.fotos().length;
    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      if (cantidad >= MAX_FOTOS) {
        errores.push(`${archivo.name}: ya hay ${MAX_FOTOS} fotos, que es el máximo`);
        continue;
      }
      if (archivo.size > MAX_BYTES_FOTO) {
        errores.push(`${archivo.name}: pesa más de 5 MB`);
        continue;
      }
      this.subiendo.set(`Subiendo ${i + 1} de ${archivos.length}...`);
      const datos = new FormData();
      datos.append('archivo', archivo); // "archivo" es el nombre del campo que espera la API
      try {
        const nueva = await this.api.subir<FotoPublicacion>(`/admin/publicaciones/${this.id()}/fotos`, datos);
        this.fotos.update((anteriores) => [...anteriores, nueva]);
        this.fotosGuardadas.update((anteriores) => [...anteriores, nueva]);
        this.portadaFallo.set(false);
        cantidad++;
      } catch (error) {
        errores.push(`${archivo.name}: ${mensajeDeError(error)}`);
      }
    }
    this.subiendo.set(null);
    this.erroresFotos.set(errores);
  }

  async borrarFoto(foto: FotoPublicacion) {
    // Se pregunta antes (igual que la web), con la ventana de la app
    const pregunta = await this.alertas.create({
      header: '¿Quitar esta foto de la publicación?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Quitar', role: 'destructive' },
      ],
    });
    await pregunta.present();
    const { role } = await pregunta.onDidDismiss();
    if (role !== 'destructive') {
      return;
    }
    this.mensaje.set(null);
    try {
      const quedan = await this.api.delete<FotoPublicacion[]>(`/admin/publicaciones/${this.id()}/fotos/${foto.id}`);
      this.fotosGuardadas.set(quedan);
      this.fotos.update((anteriores) => anteriores.filter((f) => f.id !== foto.id));
      this.portadaFallo.set(false);
    } catch (error) {
      this.mensaje.set({ tipo: 'error', texto: `No se pudo borrar la foto: ${mensajeDeError(error)}` });
    }
  }

  moverFoto(desde: number, hasta: number) {
    this.fotos.update((anteriores) => {
      const copia = [...anteriores];
      const [foto] = copia.splice(desde, 1);
      copia.splice(hasta, 0, foto);
      return copia;
    });
    this.portadaFallo.set(false);
    this.mensaje.set(null);
  }

  cambiarEtiqueta(fotoId: string, evento: Event) {
    const etiqueta = (evento.target as HTMLInputElement).value;
    this.fotos.update((anteriores) => anteriores.map((f) => (f.id === fotoId ? { ...f, label: etiqueta } : f)));
    this.mensaje.set(null);
  }

  marcarPortadaFallida() {
    this.portadaFallo.set(true);
  }
}
