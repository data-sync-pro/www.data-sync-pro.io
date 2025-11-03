import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { RecipePrerequisiteItem, RecipeQuickLink } from '../../../core/models/recipe.model';
import { TrackByUtil } from '../../../../shared/utils/trackby.util';

/**
 * Prerequisites Editor Component
 *
 * Handles editing of recipe prerequisites:
 * - Prerequisite descriptions
 * - Quick links for each prerequisite
 *
 * Each prerequisite can have multiple quick links to related resources.
 */
@Component({
  selector: 'app-prerequisites-editor',
  templateUrl: './prerequisites-editor.component.html',
  styleUrls: ['./prerequisites-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrerequisitesEditorComponent {
  @Input() prerequisites: RecipePrerequisiteItem[] = [];
  @Output() prerequisitesChange = new EventEmitter<void>();

  // ==================== Change Handler ====================

  /**
   * Notify parent of changes
   */
  onChange(): void {
    this.prerequisitesChange.emit();
  }

  // ==================== Prerequisites Management ====================

  /**
   * Add new prerequisite
   */
  addPrerequisite(): void {
    const newPrereq: RecipePrerequisiteItem = {
      description: '',
      quickLinks: []
    };

    this.prerequisites.push(newPrereq);
    this.onChange();
  }

  /**
   * Remove prerequisite at index
   */
  removePrerequisite(index: number): void {
    if (!this.prerequisites) return;

    this.prerequisites.splice(index, 1);
    this.onChange();
  }

  // ==================== Quick Links Management ====================

  /**
   * Add quick link to prerequisite
   */
  addQuickLink(prereqIndex: number): void {
    if (!this.prerequisites?.[prereqIndex]) return;

    const newLink: RecipeQuickLink = {
      title: '',
      url: ''
    };

    this.prerequisites[prereqIndex].quickLinks.push(newLink);
    this.onChange();
  }

  /**
   * Remove quick link from prerequisite
   */
  removeQuickLink(prereqIndex: number, linkIndex: number): void {
    if (!this.prerequisites?.[prereqIndex]) return;

    this.prerequisites[prereqIndex].quickLinks.splice(linkIndex, 1);
    this.onChange();
  }

  // ==================== Utility Methods ====================

  /**
   * Track by index for ngFor performance
   */
  trackByIndex = TrackByUtil.index;
}
