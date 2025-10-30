import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { RecipeSection } from '../../shared/models/recipe.model';

/**
 * Recipe Table of Contents Component
 * Displays navigation TOC with overview and walkthrough sections
 */
@Component({
  selector: 'app-recipe-toc',
  templateUrl: './recipe-toc.component.html',
  styleUrls: ['./recipe-toc.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'recipe-toc recipe-toc-outline'
  }
})
export class RecipeTocComponent {

  // ==================== Inputs ====================

  /**
   * Overview sections for TOC
   */
  @Input() overviewSections: RecipeSection[] = [];

  /**
   * Walkthrough sections for TOC
   */
  @Input() walkthroughSections: RecipeSection[] = [];

  /**
   * Currently active section ID
   */
  @Input() activeSectionId: string = '';

  /**
   * Whether TOC should be visible
   */
  @Input() visible: boolean = false;

  // ==================== Outputs ====================

  /**
   * Emitted when user clicks an overview section
   */
  @Output() overviewSectionClick = new EventEmitter<string>();

  /**
   * Emitted when user clicks a walkthrough section
   */
  @Output() walkthroughSectionClick = new EventEmitter<number>();

  // ==================== Event Handlers ====================

  /**
   * Handle overview section click
   */
  onOverviewSectionClick(elementId: string | undefined): void {
    if (elementId) {
      this.overviewSectionClick.emit(elementId);
    }
  }

  /**
   * Handle walkthrough section click
   */
  onWalkthroughSectionClick(index: number): void {
    this.walkthroughSectionClick.emit(index);
  }

  // ==================== TrackBy Functions ====================

  /**
   * TrackBy function for sections
   */
  trackBySectionId(index: number, section: RecipeSection): string {
    return section.id || section.elementId || index.toString();
  }
}
