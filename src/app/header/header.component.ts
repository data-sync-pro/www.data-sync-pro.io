import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';

interface NavItem {
  label: string;
  link: string;
  hasMegaMenu?: boolean;
  isOpen: boolean;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  isPortrait = false;   // True if device/browser is in portrait
  navOpen = false;      // True if the entire nav is open in portrait

  navItems: NavItem[] = [
    { label: 'Home', link: '/home', isOpen: false },
    { label: 'Rules Engines', link: '/rules-engines', hasMegaMenu: true, isOpen: false },
    { label: 'Solutions', link: '/solutions', hasMegaMenu: true, isOpen: false },
    { label: 'FAQ', link: '/faq', isOpen: false },
    { label: 'Support', link: '/support', hasMegaMenu: true, isOpen: false },
    { label: 'Pricing', link: '/pricing', isOpen: false },
  ];

  private orientationQuery!: MediaQueryList;
  private orientationChangeHandler!: () => void;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // 1) Initialize the MediaQueryList
    this.orientationQuery = window.matchMedia('(orientation: portrait)');

    // 2) Check current orientation
    this.isPortrait = this.orientationQuery.matches;

    // 3) Create a listener for orientation changes
    this.orientationChangeHandler = () => {
      this.isPortrait = this.orientationQuery.matches;
      // Optional: close the entire nav on orientation change
      this.navOpen = false;
      // Also close all sub-menus
      this.navItems.forEach(item => (item.isOpen = false));

      this.cdr.detectChanges();
    };

    // 4) Attach the event listener
    if (this.orientationQuery.addEventListener) {
      // Modern browsers
      this.orientationQuery.addEventListener('change', this.orientationChangeHandler);
    } else {
      // Older browsers
      this.orientationQuery.addListener(this.orientationChangeHandler);
    }
  }

  ngOnDestroy(): void {
    // Clean up the event listener
    if (this.orientationQuery.removeEventListener) {
      this.orientationQuery.removeEventListener('change', this.orientationChangeHandler);
    } else {
      this.orientationQuery.removeListener(this.orientationChangeHandler);
    }
  }

  /** Toggle the entire nav open/closed (portrait mode) */
  toggleNav(): void {
    this.navOpen = !this.navOpen;
    if (!this.navOpen) {
      // If closing the nav, also collapse all sub-menus
      this.navItems.forEach(item => (item.isOpen = false));
    }
  }

  /** Called when user clicks a nav-item (portrait mode) */
  onNavItemClick(index: number): void {
    // In portrait, if it has a mega menu, toggle sub-menu
    if (this.isPortrait && this.navItems[index].hasMegaMenu) {
      this.navItems[index].isOpen = !this.navItems[index].isOpen;
    }
    // If no mega menu or in horizontal mode, do nothing special
    // (the link will just navigate).
  }
}
