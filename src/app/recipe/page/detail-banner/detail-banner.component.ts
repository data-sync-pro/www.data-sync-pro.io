import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

@Component({
  selector: 'app-recipe-detail-banner',
  templateUrl: './detail-banner.component.html',
  styleUrls: ['./detail-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeDetailBannerComponent {
  @Input() title: string = '';
  @Input() breadcrumbs: BreadcrumbItem[] = [];
}
