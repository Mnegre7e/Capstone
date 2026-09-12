import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PanelPrincipalPage } from './panel-principal.page';

describe('PanelPrincipalPage', () => {
  let component: PanelPrincipalPage;
  let fixture: ComponentFixture<PanelPrincipalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PanelPrincipalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
