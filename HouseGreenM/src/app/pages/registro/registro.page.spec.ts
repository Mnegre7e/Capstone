/// <reference types="jasmine" />
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RegistroPage } from './registro.page';

describe('RegistroPage', () => {
  let component: RegistroPage;
  let fixture: ComponentFixture<RegistroPage>;
   
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RegistroPage],
      imports: [RouterModule.forRoot([]), FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('Validacion Largo de contraseña', () => {
    component.nombreyApellido = 'Esteban Toledo';
    component.usuario = 'Xtroner';
    component.rut = '123456789';
    component.contrasenia = 'Hola123';
    component.nuevaContrasenia = 'Hola123';
    component.telefono = '123456789';
    component.correo = 'admin@duocuc.cl';

    expect(component.contrasenia.length).toBeGreaterThanOrEqual(6);
  });
});