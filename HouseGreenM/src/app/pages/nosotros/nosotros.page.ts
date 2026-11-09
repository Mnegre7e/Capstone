import { Component } from '@angular/core';

// Paso 129: "Nosotros", igual que pages/NosotrosPage.tsx de la web (la web la tiene en el pie de página;
// la app, en el menú). Antes era la pantalla del prototipo, con otro encabezado y otros colores.
@Component({
  selector: 'app-nosotros',
  templateUrl: './nosotros.page.html',
  styleUrls: ['./nosotros.page.scss'],
  standalone: false,
})
export class NosotrosPage {
  readonly VALORES = [
    { nombre: 'Transparencia', texto: 'Información verificada directamente de fuentes oficiales y procesos judiciales.' },
    { nombre: 'Innovación', texto: 'Herramientas avanzadas como el análisis de riesgo por semáforo en tiempo real.' },
    { nombre: 'Seguridad', texto: 'Resguardo y fiabilidad constante en cada uno de los datos presentados.' },
  ];
}
