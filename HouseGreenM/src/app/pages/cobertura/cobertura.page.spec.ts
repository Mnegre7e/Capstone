import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoberturaPage } from './cobertura.page';

describe('CoberturaPage', () => {
  let component: CoberturaPage;
  let fixture: ComponentFixture<CoberturaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CoberturaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
