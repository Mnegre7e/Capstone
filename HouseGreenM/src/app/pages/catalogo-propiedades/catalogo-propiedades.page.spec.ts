import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { CatalogoPropiedadesPage } from './catalogo-propiedades.page';

describe('CatalogoPropiedadesPage', () => {
  let component: CatalogoPropiedadesPage;
  let fixture: ComponentFixture<CatalogoPropiedadesPage>;

  const routerMock = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CatalogoPropiedadesPage ],
      providers: [
        { provide: Router, useValue: routerMock }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogoPropiedadesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});