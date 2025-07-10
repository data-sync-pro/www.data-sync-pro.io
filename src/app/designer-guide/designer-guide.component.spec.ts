import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DesignerGuideComponent } from './designer-guide.component';

describe('DesignerGuideComponent', () => {
  let component: DesignerGuideComponent;
  let fixture: ComponentFixture<DesignerGuideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesignerGuideComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DesignerGuideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
