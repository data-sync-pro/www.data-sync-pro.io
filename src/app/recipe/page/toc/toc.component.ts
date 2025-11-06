import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Section } from '../../core/models/recipe.model';

@Component({
  selector: 'app-recipe-toc',
  templateUrl: './toc.component.html',
  styleUrls: ['./toc.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'recipe-toc recipe-toc-outline'
  }
})
export class RecipeTocComponent {

  @Input() overviewSections: Section[] = [];

  @Input() walkthroughSections: Section[] = [];

  @Input() activeSectionId: string = '';

  @Input() visible: boolean = false;

  @Output() overviewSectionClick = new EventEmitter<string>();

  @Output() walkthroughSectionClick = new EventEmitter<number>();

  onOverviewSectionClick(elementId: string | undefined): void {
    if (elementId) {
      this.overviewSectionClick.emit(elementId);
    }
  }

  onWalkthroughSectionClick(index: number): void {
    this.walkthroughSectionClick.emit(index);
  }

  trackBySectionId(index: number, section: Section): string {
    return section.id || section.elementId || index.toString();
  }
}
