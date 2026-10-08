import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PropiedadesGuardadasPage } from './propiedades-guardadas.page';

describe('PropiedadesGuardadasPage', () => {
  let component: PropiedadesGuardadasPage;
  let fixture: ComponentFixture<PropiedadesGuardadasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PropiedadesGuardadasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
