import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { SectionConfig } from '../../shared/services/recipe-toc.service';

/**
 * Section configuration with data loaded for rendering
 */
export type SectionWithData = SectionConfig & { data: any };

/**
 * Recipe Overview Section Component
 * Renders different types of content sections (html, text, lists, downloads, etc.)
 */
@Component({
  selector: 'app-recipe-overview-section',
  templateUrl: './recipe-overview-section.component.html',
  styleUrls: ['./recipe-overview-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeOverviewSectionComponent {

  // ==================== Inputs ====================

  /**
   * Section configuration with content data
   */
  @Input() section!: SectionWithData;

  // ==================== Outputs ====================

  /**
   * Emitted when user clicks a download button
   */
  @Output() downloadClick = new EventEmitter<{url: string, title: string, fileName: string}>();

  // ==================== Event Handlers ====================

  /**
   * Handle download button click
   */
  onDownloadClick(url: string, title: string, fileName: string): void {
    this.downloadClick.emit({ url, title, fileName });
  }

  /**
   * Cast helper for template type assertions
   */
  asAny(value: any): any {
    return value;
  }
}
