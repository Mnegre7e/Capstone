import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CatalogoPropiedadesPage } from './catalogo-propiedades.page';

describe('CatalogoPropiedadesPage', () => {
  let component: CatalogoPropiedadesPage;
  let fixture: ComponentFixture<CatalogoPropiedadesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CatalogoPropiedadesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
