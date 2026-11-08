import { Component, computed, input } from '@angular/core';

import { categoriaDeTipo } from '../core/remates';

// Paso A2: el dibujo que reemplaza a la foto cuando el remate no tiene (el mismo de la web),
// con un color suave según la categoría de la propiedad.
@Component({
  selector: 'app-sin-foto',
  standalone: false,
  template: `
    <div [class]="'hg-sin-foto hg-sin-foto-' + categoria()" role="img" [attr.aria-label]="'Sin foto: ' + tipo()">
      <svg viewBox="0 0 48 48" aria-hidden="true">
        @switch (categoria()) {
          @case ('departamento') {
            <svg:rect x="12" y="6" width="24" height="36" rx="2" />
            <svg:path d="M18 14h4M26 14h4M18 21h4M26 21h4M18 28h4M26 28h4" />
            <svg:path d="M21 42v-7h6v7" />
          }
          @case ('casa') {
            <svg:path d="M5 23 24 8l19 15" />
            <svg:path d="M11 19v21h26V19" />
            <svg:path d="M20 40V29h8v11" />
          }
          @case ('terreno') {
            <svg:path d="M24 20 44 30 24 40 4 30z" />
            <svg:path d="M24 30V9" />
            <svg:path d="M24 9l9 4-9 4" />
          }
          @case ('parcela') {
            <svg:circle cx="24" cy="17" r="10" />
            <svg:path d="M24 27v13" />
            <svg:path d="M24 33l5-4" />
            <svg:path d="M9 40h30" />
          }
          @case ('comercial') {
            <svg:path d="M8 19 12 8h24l4 11" />
            <svg:path d="M8 19a4 4 0 0 0 8 0 4 4 0 0 0 8 0 4 4 0 0 0 8 0 4 4 0 0 0 8 0" />
            <svg:path d="M11 24v16h26V24" />
            <svg:path d="M20 40V30h8v10" />
          }
          @case ('bodega') {
            <svg:path d="M5 20 24 9l19 11" />
            <svg:path d="M9 18v22h30V18" />
            <svg:rect x="16" y="25" width="16" height="15" />
            <svg:path d="M16 30h16M16 35h16" />
          }
          @case ('derechos') {
            <svg:path d="M13 6h15l8 8v28H13z" />
            <svg:path d="M28 6v8h8" />
            <svg:circle cx="20" cy="25" r="2.5" />
            <svg:circle cx="29" cy="34" r="2.5" />
            <svg:path d="M30 23 19 36" />
          }
          @default {
            <svg:path d="M24 43s13-12.5 13-23a13 13 0 1 0-26 0c0 10.5 13 23 13 23z" />
            <svg:circle cx="24" cy="20" r="5" />
          }
        }
      </svg>
    </div>
  `,
})
export class SinFotoComponent {
  readonly tipo = input.required<string>();
  readonly categoria = computed(() => categoriaDeTipo(this.tipo()));
}
