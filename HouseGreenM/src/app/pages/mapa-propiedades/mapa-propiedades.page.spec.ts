import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapaPropiedadesPage } from './mapa-propiedades.page';

describe('MapaPropiedadesPage', () => {
  let component: MapaPropiedadesPage;
  let fixture: ComponentFixture<MapaPropiedadesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MapaPropiedadesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
