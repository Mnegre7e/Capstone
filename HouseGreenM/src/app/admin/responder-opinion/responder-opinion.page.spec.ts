import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResponderOpinionPage } from './responder-opinion.page';

describe('ResponderOpinionPage', () => {
  let component: ResponderOpinionPage;
  let fixture: ComponentFixture<ResponderOpinionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ResponderOpinionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
