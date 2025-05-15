/* admin-guide.component.ts */
import { Component } from '@angular/core';
import navRaw from '../../assets/data/admin-sidebar.json';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

interface Item {
  title: string;
  slug: string;
  parentSlug: string;   // ← 必需
  sub?: string;
}
interface NavNode {
  parent: string;
  parentSlug: string;
  items: Item[];
}

@Component({
  selector: 'app-admin-guide',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-guide.component.html',
  styleUrls: ['./admin-guide.component.scss']
})
export class AdminGuideComponent {
  nav: NavNode[] = Object.entries(navRaw).map(([parent, val]) => {
    const parentSlug = slug(parent);

    if (Array.isArray(val)) {
      return {
        parent,
        parentSlug,
        items: val.map(title => ({
          title,
          slug: slug(title),
          parentSlug            // ← 塞进去
        }))
      };
    }

    // 带二级分类
    const items = Object.entries(val as Record<string, string[]>).flatMap(
      ([sub, arr]) =>
        arr.map(title => ({
          title,
          slug: slug(title),
          parentSlug,          // ← 同样塞进去
          sub: slug(sub)
        }))
    );

    return { parent, parentSlug, items };
  });

  /** 根据 item 生成路由数组 */
  buildLink(i: Item) {
    return i.sub
      ? [i.parentSlug, i.sub, i.slug]
      : [i.parentSlug, i.slug];
  }
}
