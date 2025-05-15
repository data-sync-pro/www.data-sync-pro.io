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
  isPortrait = false;
  navOpen = false;

  navItems: NavItem[] = [
    { label: 'Home', link: '/home', isOpen: false },
    //{ label: 'Rules Engines', link: '/rules-engines', hasMegaMenu: true, isOpen: false },
    //{ label: 'Solutions', link: '/solutions', hasMegaMenu: true, isOpen: false },
    { label: 'FAQ', link: '/faq', isOpen: false },
    //{ label: 'Support', link: '/support', hasMegaMenu: true, isOpen: false },
    { label: 'Pricing', link: '/pricing', isOpen: false },
    { label: 'Admin Guide', link:'/admin-guide', isOpen: false}
  ];

  private orientationQuery!: MediaQueryList;
  private orientationChangeHandler!: () => void;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.orientationQuery = window.matchMedia('(orientation: portrait)');
    this.isPortrait = this.orientationQuery.matches;
    this.orientationChangeHandler = () => {
      this.isPortrait = this.orientationQuery.matches;
      this.navOpen = false;
      this.navItems.forEach(item => (item.isOpen = false));
      this.cdr.detectChanges();
    };

    if (this.orientationQuery.addEventListener) {
      this.orientationQuery.addEventListener('change', this.orientationChangeHandler);
    } else {
      this.orientationQuery.addListener(this.orientationChangeHandler);
    }
  }

  ngOnDestroy(): void {
    if (this.orientationQuery.removeEventListener) {
      this.orientationQuery.removeEventListener('change', this.orientationChangeHandler);
    } else {
      this.orientationQuery.removeListener(this.orientationChangeHandler);
    }
  }

  toggleNav(): void {
    this.navOpen = !this.navOpen;
    if (!this.navOpen) {
      this.navItems.forEach(item => (item.isOpen = false));
    }
  }

  onNavItemClick(index: number): void {
    if (this.isPortrait && this.navItems[index].hasMegaMenu) {
      this.navItems[index].isOpen = !this.navItems[index].isOpen;
    }
  }
}
