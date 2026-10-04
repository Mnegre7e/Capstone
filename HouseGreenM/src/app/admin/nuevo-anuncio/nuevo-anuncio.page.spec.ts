import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevoAnuncioPage } from './nuevo-anuncio.page';

describe('NuevoAnuncioPage', () => {
  let component: NuevoAnuncioPage;
  let fixture: ComponentFixture<NuevoAnuncioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NuevoAnuncioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
