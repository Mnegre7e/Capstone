import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';

interface AlertaItem {
  id: number;
  titulo: string;
  descripcion: string;
  tiempo: string;
  leida: boolean;
  tipo: 'remate_proximo' | 'semaforo_alerta' | 'nuevo_remate' | 'precio_bajo' | 'reprogramado';
}

interface PreferenciaAlerta {
  id: string;
  titulo: string;
  subtitulo: string;
  activo: boolean;
}

@Component({
  selector: 'app-alertas',
  templateUrl: './alertas.page.html',
  styleUrls: ['./alertas.page.scss'],
  standalone: false
})
export class AlertasPage {

  private location = inject(Location);

  alertasHoy: AlertaItem[] = [
    {
      id: 1,
      titulo: 'Faltan 7 días para tu remate',
      descripcion: 'Depto. 2D 1B · Santiago Centro se remata el vie 2 oct a las 10:00.',
      tiempo: 'Hace 2 horas',
      leida: false,
      tipo: 'remate_proximo'
    },
    {
      id: 2,
      titulo: 'Cambió el semáforo a riesgo alto',
      descripcion: 'Depto. 1D 1B · Estación Central pasó de medio a alto: se detectó deuda de contribuciones en TGR.',
      tiempo: 'Hace 5 horas',
      leida: false,
      tipo: 'semaforo_alerta'
    },
    {
      id: 3,
      titulo: 'Nuevo remate en Providencia',
      descripcion: 'Oficina de 64 m² con mínimo de $95.000.000, en una comuna que sigues.',
      tiempo: 'Hoy, 08:15',
      leida: false,
      tipo: 'nuevo_remate'
    }
  ];

  alertasEstaSemana: AlertaItem[] = [
    {
      id: 4,
      titulo: 'Bajó el precio mínimo',
      descripcion: 'Terreno · Puente Alto: de $52.500.000 a $35.000.000 tras quedar sin postores.',
      tiempo: 'mié 23 sep',
      leida: true,
      tipo: 'precio_bajo'
    },
    {
      id: 5,
      titulo: 'Remate reprogramado',
      descripcion: 'Casa · La Florida pasa del vie 9 oct al vie 16 oct, a las 11:00.',
      tiempo: 'lun 21 sep',
      leida: true,
      tipo: 'reprogramado'
    }
  ];

  preferencias: PreferenciaAlerta[] = [
    {
      id: 'remate_recordatorio',
      titulo: 'Recordatorio antes del remate',
      subtitulo: '3 días y 1 día antes',
      activo: true
    },
    {
      id: 'cambio_semaforo',
      titulo: 'Cambios de semáforo',
      subtitulo: 'En tus propiedades guardadas',
      activo: true
    },
    {
      id: 'nuevos_remates',
      titulo: 'Nuevos remates en mis comunas',
      subtitulo: 'Santiago y Providencia',
      activo: true
    },
    {
      id: 'rebaja_precio',
      titulo: 'Rebajas del precio mínimo',
      subtitulo: 'Cuando un remate queda sin postores',
      activo: false
    }
  ];

  goBack() {
    this.location.back();
  }

  marcarTodasLeidas() {
    this.alertasHoy.forEach(a => a.leida = true);
    this.alertasEstaSemana.forEach(a => a.leida = true);
  }

  togglePreferencia(pref: PreferenciaAlerta) {
    pref.activo = !pref.activo;
  }
}