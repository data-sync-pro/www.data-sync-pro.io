import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { SectionConfig } from '../services/toc.service';
import { ClipboardUtil } from '../../../shared/utils/clipboard.util';

/**
 * Media item (image, video, etc.)
 */
export interface MediaItem {
  url: string;
  type: string;
  alt?: string;
}

/**
 * Configuration field
 */
export interface ConfigField {
  field: string;
  value: unknown;
}

/**
 * Quick link
 */
export interface QuickLink {
  url: string;
  title: string;
}

/**
 * Prerequisite item
 */
export interface PrerequisiteRecipe {
  description: string;
  quickLinks?: QuickLink[];
}

/**
 * Section data structure
 */
export interface SectionData {
  media?: MediaItem[];
  config?: ConfigField[];
  tags?: string[];
  downloads?: { url: string; title: string; fileName: string }[];
  relatedLinks?: QuickLink[];
  quickLinks?: QuickLink[];
  prerequisites?: PrerequisiteRecipe[];
}

/**
 * Section configuration with data loaded for rendering
 */
export type SectionWithData = SectionConfig & { data: SectionData };

/**
 * Unified Recipe Section Component
 * Renders all types of content sections: overview sections AND walkthrough steps
 * This component replaces both RecipeOverviewSectionComponent and RecipeStepComponent
 */
@Component({
  selector: 'app-recipe-section',
  templateUrl: './section.component.html',
  styleUrls: ['./section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeSectionComponent {

  // ==================== Inputs ====================

  /**
   * Section configuration with content data
   */
  @Input() section!: SectionWithData;

  /**
   * Step index for walkthrough steps (optional, only used for walkthrough-step type)
   */
  @Input() stepIndex?: number;

  // ==================== Outputs ====================

  /**
   * Emitted when user clicks a download button
   */
  @Output() downloadClick = new EventEmitter<{url: string, title: string, fileName: string}>();

  // ==================== Computed Properties ====================

  /**
   * Get display step number (1-based) for walkthrough steps
   */
  get displayStepNumber(): number {
    return (this.stepIndex ?? 0) + 1;
  }

  // ==================== Event Handlers ====================

  /**
   * Handle download button click
   */
  onDownloadClick(url: string, title: string, fileName: string): void {
    this.downloadClick.emit({ url, title, fileName });
  }

  /**
   * Copy text to clipboard (for walkthrough config fields)
   */
  copyToClipboard(event: Event, text: string): void {
    event.stopPropagation();
    ClipboardUtil.copyToClipboard(text);
  }

  // ==================== Helper Methods ====================

  /**
   * Cast helper for template type assertions
   * Returns any to allow template iterations on dynamic data
   */
  asAny(value: unknown): any {
    return value;
  }

  /**
   * Check if a field is a boolean field (ends with ?)
   * Used for walkthrough config fields
   */
  isBoolean(fieldName: string): boolean {
    return !!(fieldName && fieldName.endsWith('?'));
  }

  /**
   * Check if a value represents true (case-insensitive)
   * Used for walkthrough config boolean fields
   */
  isTrueValue(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return false;
  }

  // ==================== TrackBy Functions ====================

  /**
   * TrackBy function for simple arrays (tags, list items)
   * Uses index for optimal performance with static lists
   */
  trackByIndex(index: number): number {
    return index;
  }

  /**
   * TrackBy function for objects with URL property
   * Used for downloads, related links, and quick links
   */
  trackByUrl(index: number, item: QuickLink | { url: string }): string | number {
    return item?.url || index;
  }

  /**
   * TrackBy function for prerequisites
   * Uses description as unique identifier
   */
  trackByDescription(index: number, item: PrerequisiteRecipe): string | number {
    return item?.description || index;
  }

  /**
   * TrackBy function for media items (walkthrough steps)
   * Uses URL as unique identifier
   */
  trackByMediaUrl(index: number, media: MediaItem): string | number {
    return media?.url || index;
  }

  /**
   * TrackBy function for config fields (walkthrough steps)
   * Uses field name as unique identifier
   */
  trackByConfigField(index: number, config: ConfigField): string | number {
    return config?.field || index;
  }
}
