import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaqHomeComponent } from './faq-home.component';

describe('FaqHomeComponent', () => {
  let component: FaqHomeComponent;
  let fixture: ComponentFixture<FaqHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FaqHomeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FaqHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
