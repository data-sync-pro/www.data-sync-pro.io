import { Component, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import navRaw from '../../assets/data/designer-sidebar.json';

interface Item {
  title: string;
  slug: string;
  parentSlug: string;
  sub?: string;
}
interface Nav {
  parent: string;
  parentSlug: string;
  expanded: boolean;
  items: Item[];
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

@Component({
  selector: 'app-designer-guide',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './designer-guide.component.html',
  styleUrls: ['./designer-guide.component.scss'],
})
export class DesignerGuideComponent implements OnDestroy {
  nav: Nav[] = Object.entries(navRaw).map(([parent, val]) => {
    const parentSlug = slug(parent);
    const expanded = false;

    if (Array.isArray(val)) {
      return {
        parent,
        parentSlug,
        expanded,
        items: val.map(t => ({
          title: t,
          slug: slug(t),
          parentSlug,
        })),
      };
    }

    const items = Object.entries(val as Record<string, string[]>).flatMap(([sub, arr]) =>
      arr.map(t => ({
        title: t,
        slug: slug(t),
        parentSlug,
        sub: slug(sub),
      }))
    );

    return { parent, parentSlug, expanded, items };
  });

  sidebarW = localStorage.getItem('sbW') || '20vw';

  private startX = 0;
  private startWidth = 0;
  private moveRef?: (e: MouseEvent) => void;
  private upRef?: () => void;

  constructor(private zone: NgZone) {}

  buildLink(i: Item) {
    return i.sub ? [i.parentSlug, i.sub, i.slug] : [i.parentSlug, i.slug];
  }

  startDrag(ev: MouseEvent, navEl: HTMLElement) {
    ev.preventDefault();

    this.startX = ev.clientX;
    const style = window.getComputedStyle(navEl);
    this.startWidth = parseFloat(style.width);

    const min = 160;
    const max = window.innerWidth * 0.6;

    this.moveRef = (e: MouseEvent) => {
      const delta = e.clientX - this.startX;
      let newW = this.startWidth + delta;
      newW = Math.max(min, Math.min(max, newW));
      this.zone.run(() => (this.sidebarW = `${newW}px`));
    };

    this.upRef = () => {
      localStorage.setItem('sbW', this.sidebarW);
      window.removeEventListener('mousemove', this.moveRef!);
      window.removeEventListener('mouseup', this.upRef!);
    };

    window.addEventListener('mousemove', this.moveRef);
    window.addEventListener('mouseup', this.upRef);
  }

  ngOnDestroy() {
    if (this.moveRef) window.removeEventListener('mousemove', this.moveRef);
    if (this.upRef) window.removeEventListener('mouseup', this.upRef);
  }
}
