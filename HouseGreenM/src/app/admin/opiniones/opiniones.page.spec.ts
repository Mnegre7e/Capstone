import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpinionesPage } from './opiniones.page';

describe('OpinionesPage', () => {
  let component: OpinionesPage;
  let fixture: ComponentFixture<OpinionesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OpinionesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
