import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlcancePage } from './alcance.page';

describe('AlcancePage', () => {
  let component: AlcancePage;
  let fixture: ComponentFixture<AlcancePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AlcancePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
