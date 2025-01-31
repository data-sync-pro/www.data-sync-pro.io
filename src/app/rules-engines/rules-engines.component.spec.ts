import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RulesEnginesComponent } from './rules-engines.component';

describe('RulesEnginesComponent', () => {
  let component: RulesEnginesComponent;
  let fixture: ComponentFixture<RulesEnginesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RulesEnginesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RulesEnginesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
