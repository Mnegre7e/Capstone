import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubastaPage } from './subasta.page';

describe('SubastaPage', () => {
  let component: SubastaPage;
  let fixture: ComponentFixture<SubastaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SubastaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
