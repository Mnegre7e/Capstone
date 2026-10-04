import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnuncioDestinatarioPage } from './anuncio-destinatario.page';

describe('AnuncioDestinatarioPage', () => {
  let component: AnuncioDestinatarioPage;
  let fixture: ComponentFixture<AnuncioDestinatarioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AnuncioDestinatarioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
