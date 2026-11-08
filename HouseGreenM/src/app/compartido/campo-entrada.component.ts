import { Component, input, model, output } from '@angular/core';

// Paso A5: un campo de los formularios de entrada, igual que CampoDeEntrada de la web: la etiqueta arriba y,
// dentro de un mismo borde, un ícono, el cuadro para escribir y, si es una contraseña, el ojo para verla.
// Se usa con [(valor)]="..." (lo que se escribe queda en esa variable). Estilos en theme/_entrada.scss.

export type IconoDeCampo = 'correo' | 'candado' | 'persona' | 'telefono';

let siguiente = 0; // para que cada campo tenga su propio id (une la etiqueta con su cuadro)

@Component({
  selector: 'app-campo-entrada',
  templateUrl: './campo-entrada.component.html',
  standalone: false,
})
export class CampoEntradaComponent {
  readonly etiqueta = input.required<string>();
  readonly icono = input.required<IconoDeCampo>();
  readonly tipo = input('text');
  readonly autocompletar = input('off');
  readonly marcador = input(''); // el texto gris de ejemplo (placeholder)
  readonly ayuda = input(''); // texto chico debajo del campo
  readonly conOjo = input(false); // solo contraseñas: muestra el botón del ojo
  readonly visible = input(false); // si la contraseña se está mostrando
  readonly valor = model('');
  readonly alternarVisible = output<void>();

  readonly id = `campo-entrada-${++siguiente}`;

  escribir(evento: Event) {
    this.valor.set((evento.target as HTMLInputElement).value);
  }
}
