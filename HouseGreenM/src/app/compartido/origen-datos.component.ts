import { Component, input } from '@angular/core';

// Paso 130: aviso del origen de los datos (Ley 19.628, actualizada por la Ley 21.719), igual al de la web
// (components/OrigenDatos.tsx). Los remates se leen de una fuente pública y se muestran tal como los publica;
// lo que agrega HouseGreen (semáforo, precio de mercado de la comuna con PropiedadesYa) es un análisis propio.
// Va en el catálogo (corto) y en cada ficha (completo). Si cambia el texto en la web, hay que cambiarlo aquí también.
@Component({
  selector: 'app-origen-datos',
  standalone: false,
  templateUrl: './origen-datos.component.html',
  styleUrls: ['./origen-datos.component.scss'],
})
export class OrigenDatosComponent {
  readonly corto = input(false);
  readonly urlOriginal = input<string | null>(null);
}
