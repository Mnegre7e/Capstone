import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

interface Anuncio {
  id: number;
  titulo: string;
  fecha: string;
  tipoAudiencia: 'vieron' | 'guardaron' | 'persona' | 'todos';
  labelAudiencia: string;
  conteoAudiencia?: number;
  leidoTexto: string;
}

@Component({
  selector: 'app-anuncios',
  templateUrl: './anuncios.page.html',
  styleUrls: ['./anuncios.page.scss'],
  standalone: false
})
export class AnunciosPage {
  private router = inject(Router);

  anuncios: Anuncio[] = [
    {
      id: 1,
      titulo: 'Nuevas fotos y bases del remate',
      fecha: 'hoy 10:15',
      tipoAudiencia: 'vieron',
      labelAudiencia: 'Vieron · Departamento 2D 1B',
      conteoAudiencia: 187,
      leidoTexto: 'Leído por 96 personas'
    },
    {
      id: 2,
      titulo: 'Se rebajó el mínimo en Maipú',
      fecha: 'jue 24 sep',
      tipoAudiencia: 'guardaron',
      labelAudiencia: 'Guardaron · Casa 3D 2B',
      conteoAudiencia: 19,
      leidoTexto: 'Leído por 15 personas'
    },
    {
      id: 3,
      titulo: 'Sobre el rol de avalúo que faltaba',
      fecha: 'mar 22 sep',
      tipoAudiencia: 'persona',
      labelAudiencia: 'Una persona · Ignacio Paredes',
      leidoTexto: 'Leído'
    },
    {
      id: 4,
      titulo: 'Nueva sección de sugerencias',
      fecha: 'lun 21 sep',
      tipoAudiencia: 'todos',
      labelAudiencia: 'Todos los usuarios',
      conteoAudiencia: 248,
      leidoTexto: 'Leído por 164 personas'
    }
  ];

  crearNuevoAnuncio() {
    this.router.navigate(['/nuevo-anuncio']);
  }

  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}