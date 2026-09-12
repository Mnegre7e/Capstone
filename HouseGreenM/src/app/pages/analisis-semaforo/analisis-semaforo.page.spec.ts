import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalisisSemaforoPage } from './analisis-semaforo.page';

describe('AnalisisSemaforoPage', () => {
  let component: AnalisisSemaforoPage;
  let fixture: ComponentFixture<AnalisisSemaforoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalisisSemaforoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
