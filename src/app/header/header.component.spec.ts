import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ChangeDetectorRef } from '@angular/core';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HeaderComponent ],
      imports: [ RouterTestingModule ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize responsive queries', () => {
    expect(component.isPortrait).toBeDefined();
    expect(component.isMobile).toBeDefined();
    expect(component.isTablet).toBeDefined();
  });

  it('should toggle navigation', () => {
    const initialNavOpen = component.navOpen;
    component.toggleNav();
    expect(component.navOpen).toBe(!initialNavOpen);
  });

  it('should reset navigation on responsive changes', () => {
    component.navOpen = true;
    component.navItems[0].isOpen = true;

    // Simulate responsive change
    component['resetNavigation']();

    expect(component.navOpen).toBe(false);
    expect(component.navItems[0].isOpen).toBe(false);
  });

  it('should handle nav item clicks on mobile', () => {
    component.isMobile = true;
    component.navItems[0].hasMegaMenu = true;
    component.navItems[0].isOpen = false;

    component.onNavItemClick(0);

    expect(component.navItems[0].isOpen).toBe(true);
  });
});
