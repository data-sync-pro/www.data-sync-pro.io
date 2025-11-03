import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { RecipeWalkthroughStep, RecipeStepConfig } from '../../../core/models/recipe.model';
import { RecipeAutocompleteService } from '../../services/autocomplete.service';
import { StepManagementUtil } from '../../utils/step-management.util';
import { TrackByUtil } from '../../../../shared/utils/trackby.util';

/**
 * Walkthrough Editor Component
 *
 * Manages recipe walkthrough steps:
 * - Add/Remove/Reorder steps
 * - Expand/Collapse steps
 * - Edit step name, content, config
 * - Custom step names
 * - Field autocomplete
 *
 * Complex component handling step-by-step instructions.
 */
@Component({
  selector: 'app-walkthrough-editor',
  templateUrl: './walkthrough-editor.component.html',
  styleUrls: ['./walkthrough-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalkthroughEditorComponent {
  @Input() walkthrough: RecipeWalkthroughStep[] = [];
  @Input() stepOptions: string[] = [];
  @Input() expandedSteps: Set<number> = new Set();
  @Input() customStepNames: { [index: number]: string } = {};
  @Input() recipeId: string = '';
  @Input() recipeCategory: string = '';

  @Output() walkthroughChange = new EventEmitter<void>();
  @Output() stepExpansionToggle = new EventEmitter<number>();

  constructor(
    private autocompleteService: RecipeAutocompleteService
  ) {}

  // ==================== Change Handler ====================

  /**
   * Notify parent of changes
   */
  onChange(): void {
    this.walkthroughChange.emit();
  }

  // ==================== Step Management ====================

  /**
   * Add new step
   */
  addStep(): void {
    const newStep: RecipeWalkthroughStep = {
      step: '',
      config: [],
      media: []
    };

    this.walkthrough.push(newStep);

    // Expand the new step by default
    const newStepIndex = this.walkthrough.length - 1;
    this.expandedSteps.add(newStepIndex);

    this.onChange();
  }

  /**
   * Remove step at index
   */
  removeStep(index: number): void {
    if (!this.walkthrough) return;

    this.walkthrough.splice(index, 1);

    // Reindex custom step names
    this.reindexCustomStepNames();

    this.onChange();
  }

  /**
   * Move step up
   */
  moveStepUp(index: number): void {
    if (!this.walkthrough) return;
    if (StepManagementUtil.moveStepUp(this.walkthrough, index, this.customStepNames)) {
      this.onChange();
    }
  }

  /**
   * Move step down
   */
  moveStepDown(index: number): void {
    if (!this.walkthrough) return;
    if (StepManagementUtil.moveStepDown(this.walkthrough, index, this.customStepNames)) {
      this.onChange();
    }
  }

  /**
   * Toggle step expansion
   */
  toggleStep(index: number): void {
    this.stepExpansionToggle.emit(index);
  }

  /**
   * Check if step is expanded
   */
  isStepExpanded(index: number): boolean {
    return this.expandedSteps.has(index);
  }

  /**
   * Get step title for display
   */
  getStepTitle(step: RecipeWalkthroughStep, index: number): string {
    if (step.step && step.step.trim() !== '') {
      if (step.step === 'Custom') {
        return this.customStepNames[index] || 'Custom Step';
      }
      return step.step;
    }
    return `Step ${index + 1}`;
  }

  // ==================== Step Selection ====================

  /**
   * Handle step type selection change
   */
  onStepSelectionChange(step: RecipeWalkthroughStep, index: number): void {
    if (step.step === 'Custom') {
      // Initialize custom name if not exists
      if (!this.customStepNames[index]) {
        this.customStepNames[index] = '';
      }
    } else {
      // Clear custom name if switching away from Custom
      delete this.customStepNames[index];
    }
    this.onChange();
  }

  /**
   * Handle custom step name change
   */
  onCustomStepNameChange(index: number): void {
    this.onChange();
  }

  /**
   * Check if step is custom
   */
  isCustomStep(step: RecipeWalkthroughStep): boolean {
    return step.step === 'Custom';
  }

  // ==================== Config Management ====================

  /**
   * Add config to step
   */
  addConfig(stepIndex: number): void {
    if (!this.walkthrough?.[stepIndex]) return;

    const newConfig: RecipeStepConfig = {
      field: '',
      value: ''
    };

    this.walkthrough[stepIndex].config.push(newConfig);
    this.onChange();
  }

  /**
   * Remove config from step
   */
  removeConfig(stepIndex: number, configIndex: number): void {
    if (!this.walkthrough?.[stepIndex]) return;

    this.walkthrough[stepIndex].config.splice(configIndex, 1);
    this.onChange();
  }

  // ==================== Autocomplete ====================

  /**
   * Handle autocomplete value selection from directive
   */
  onAutocompleteSelect(value: string, stepIndex: number, configIndex: number): void {
    if (this.walkthrough?.[stepIndex]?.config?.[configIndex]) {
      this.walkthrough[stepIndex].config[configIndex].field = value;
      this.onChange();
    }
  }

  /**
   * Get field suggestions for a step
   */
  getFieldSuggestions(stepName: string): string[] {
    return this.autocompleteService.getFieldSuggestions(stepName);
  }

  // ==================== Helper Methods ====================

  /**
   * Reindex custom step names after removal
   */
  private reindexCustomStepNames(): void {
    if (!this.walkthrough) return;
    this.customStepNames = StepManagementUtil.reindexCustomStepNames(
      this.walkthrough,
      this.customStepNames
    );
  }

  /**
   * Track by index for ngFor performance
   */
  trackByIndex = TrackByUtil.index;
}
