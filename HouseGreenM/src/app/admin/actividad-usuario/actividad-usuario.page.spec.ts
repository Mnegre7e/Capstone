import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActividadUsuarioPage } from './actividad-usuario.page';

describe('ActividadUsuarioPage', () => {
  let component: ActividadUsuarioPage;
  let fixture: ComponentFixture<ActividadUsuarioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ActividadUsuarioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
