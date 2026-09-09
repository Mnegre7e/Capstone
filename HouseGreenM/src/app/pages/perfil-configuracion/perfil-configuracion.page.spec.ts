import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerfilConfiguracionPage } from './perfil-configuracion.page';

describe('PerfilConfiguracionPage', () => {
  let component: PerfilConfiguracionPage;
  let fixture: ComponentFixture<PerfilConfiguracionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PerfilConfiguracionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
