import { Component, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular/lazy';

// Lo que usamos del elemento <ion-content> (sus métodos para desplazarse)
type Contenido = HTMLElement & {
  getScrollElement(): Promise<HTMLElement>;
  scrollToPoint(x: number, y: number, duracion: number): Promise<void>;
  scrollToTop(duracion: number): Promise<void>;
};

// Paso A5: política de privacidad (Ley 19.628, actualizada por la Ley 21.719), la misma de la web.
// Se ve con o sin cuenta: el registro la enlaza ("Al crear tu cuenta aceptas la Política de privacidad").
// Paso 130 (versión 1.1): nuevo punto 9, de dónde vienen los datos de los remates (#origen-datos).
@Component({
  selector: 'app-privacidad',
  templateUrl: './privacidad.page.html',
  styleUrls: ['./privacidad.page.scss'],
  standalone: false,
})
export class PrivacidadPage {
  private navegacion = inject(NavController);
  private ruta = inject(ActivatedRoute);
  private elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly VERSION = 'Versión 1.1 · noviembre de 2026';

  // Paso 133: si la página ya está abierta y se toca "Origen de los datos" (o "Política de privacidad")
  // en el menú, solo cambia el #ancla: se baja al punto 9 (o se vuelve arriba) sin salir de la página
  private enPantalla = false;

  constructor() {
    this.ruta.fragment.pipe(takeUntilDestroyed()).subscribe((ancla) => {
      if (this.enPantalla) void this.irAlAncla(ancla, true);
    });
  }

  // Paso 130: si se entra con #origen-datos (desde el catálogo, una ficha o el menú), baja hasta ese punto
  ionViewDidEnter() {
    this.enPantalla = true;
    void this.irAlAncla(this.ruta.snapshot.fragment, false);
  }

  ionViewWillLeave() {
    this.enPantalla = false;
  }

  private async irAlAncla(ancla: string | null, arribaSiNoHay: boolean) {
    const contenido = this.elemento.nativeElement.querySelector<Contenido>('ion-content');
    if (!contenido) return;
    const punto = ancla ? this.elemento.nativeElement.querySelector<HTMLElement>(`#${ancla}`) : null;
    if (!punto) {
      if (arribaSiNoHay) await contenido.scrollToTop(400);
      return;
    }
    const caja = await contenido.getScrollElement();
    const y = punto.getBoundingClientRect().top - caja.getBoundingClientRect().top + caja.scrollTop;
    await contenido.scrollToPoint(0, Math.max(y - 12, 0), 400);
  }

  volver() {
    this.navegacion.back();
  }
}
