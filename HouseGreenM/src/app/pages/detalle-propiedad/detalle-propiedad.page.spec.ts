import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetallePropiedadPage } from './detalle-propiedad.page';

describe('DetallePropiedadPage', () => {
  let component: DetallePropiedadPage;
  let fixture: ComponentFixture<DetallePropiedadPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetallePropiedadPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
