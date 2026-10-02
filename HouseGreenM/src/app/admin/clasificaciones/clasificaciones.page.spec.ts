import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClasificacionesPage } from './clasificaciones.page';

describe('ClasificacionesPage', () => {
  let component: ClasificacionesPage;
  let fixture: ComponentFixture<ClasificacionesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ClasificacionesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
