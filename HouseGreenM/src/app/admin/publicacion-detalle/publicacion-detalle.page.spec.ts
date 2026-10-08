import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PublicacionDetallePage } from './publicacion-detalle.page';

describe('PublicacionDetallePage', () => {
  let component: PublicacionDetallePage;
  let fixture: ComponentFixture<PublicacionDetallePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PublicacionDetallePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
