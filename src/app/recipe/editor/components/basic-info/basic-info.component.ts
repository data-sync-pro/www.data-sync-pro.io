import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { SourceRecipeRecord, RecipeRelatedItem } from '../../../core/models/recipe.model';
import { TrackByUtil } from '../../../../shared/utils/trackby.util';

/**
 * Basic Info Component
 *
 * Handles editing of core recipe metadata:
 * - Active status
 * - Title, Category
 * - Overview, General Use Case
 * - Direction, Connection
 * - DSP Versions (dynamic list)
 * - Keywords (dynamic list)
 * - Related Recipes (dynamic list)
 *
 * Emits changes to parent component for state management.
 */
@Component({
  selector: 'app-basic-info',
  templateUrl: './basic-info.component.html',
  styleUrls: ['./basic-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BasicInfoComponent {
  @Input() recipe!: SourceRecipeRecord;
  @Input() isActive: boolean = true;
  @Input() categories: string[] = [];

  @Output() recipeChange = new EventEmitter<void>();
  @Output() activeChange = new EventEmitter<boolean>();

  // ==================== Change Handlers ====================

  /**
   * Notify parent of recipe changes
   */
  onRecipeChange(): void {
    this.recipeChange.emit();
  }

  /**
   * Notify parent of active status changes
   */
  onActiveChange(): void {
    this.activeChange.emit(this.isActive);
    this.onRecipeChange();
  }

  // ==================== DSP Versions Management ====================

  /**
   * Add new DSP version
   */
  addDSPVersion(): void {
    this.ensureArrayAndPush('DSPVersions', '');
  }

  /**
   * Remove DSP version at index
   */
  removeDSPVersion(index: number): void {
    this.removeFromArray('DSPVersions', index);
  }

  // ==================== Keywords Management ====================

  /**
   * Add new keyword
   */
  addKeyword(): void {
    this.ensureArrayAndPush('keywords', '');
  }

  /**
   * Remove keyword at index
   */
  removeKeyword(index: number): void {
    this.removeFromArray('keywords', index);
  }

  // ==================== Related Recipes Management ====================

  /**
   * Add new related recipe
   */
  addRelatedRecipe(): void {
    const newRelated: RecipeRelatedItem = {
      title: '',
      url: ''
    };
    this.ensureArrayAndPush('relatedRecipes', newRelated);
  }

  /**
   * Remove related recipe at index
   */
  removeRelatedRecipe(index: number): void {
    this.removeFromArray('relatedRecipes', index);
  }

  // ==================== Utility Methods ====================

  /**
   * Track by index for ngFor performance
   */
  trackByIndex = TrackByUtil.index;

  // ==================== Helper Methods ====================

  /**
   * Ensure array exists and push new item
   * @param key - Property key on recipe object
   * @param item - Item to push to array
   */
  private ensureArrayAndPush<T>(key: keyof SourceRecipeRecord, item: T): void {
    if (!this.recipe) return;

    if (!(this.recipe[key] as any)) {
      (this.recipe[key] as any) = [];
    }

    (this.recipe[key] as T[]).push(item);
    this.onRecipeChange();
  }

  /**
   * Remove item from array at index
   * @param key - Property key on recipe object
   * @param index - Index to remove
   */
  private removeFromArray(key: keyof SourceRecipeRecord, index: number): void {
    const array = this.recipe?.[key] as any[];
    if (!array) return;

    array.splice(index, 1);
    this.onRecipeChange();
  }
}
