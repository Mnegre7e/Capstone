import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  // Mocks para evitar fallos por dependencias nativas durante las pruebas
  const nativeStorageMock = {
    getItem: jasmine.createSpy('getItem').and.returnValue(Promise.resolve('Inversionista'))
  };

  const menuControllerMock = {
    enable: jasmine.createSpy('enable')
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HomePage ],
      providers: [
        { provide: NativeStorage, useValue: nativeStorageMock },
        { provide: MenuController, useValue: menuControllerMock }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});