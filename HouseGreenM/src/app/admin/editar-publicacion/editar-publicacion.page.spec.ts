import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditarPublicacionPage } from './editar-publicacion.page';

describe('EditarPublicacionPage', () => {
  let component: EditarPublicacionPage;
  let fixture: ComponentFixture<EditarPublicacionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditarPublicacionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
