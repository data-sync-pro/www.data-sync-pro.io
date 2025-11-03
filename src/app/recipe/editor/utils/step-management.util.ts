import { RecipeWalkthroughStep } from '../../core/models/recipe.model';

/**
 * Step Management Utility
 *
 * Provides reusable methods for managing recipe walkthrough steps:
 * - Swapping steps
 * - Moving steps up/down
 * - Managing custom step names during swaps
 * - Reindexing custom step names
 */
export class StepManagementUtil {
  /**
   * Swap two steps in an array
   * @param steps - Array of walkthrough steps
   * @param index1 - First index
   * @param index2 - Second index
   * @param customStepNames - Optional custom step names map to update
   */
  static swapSteps(
    steps: RecipeWalkthroughStep[],
    index1: number,
    index2: number,
    customStepNames?: { [index: number]: string }
  ): void {
    if (!steps || index1 < 0 || index2 < 0 || index1 >= steps.length || index2 >= steps.length) {
      return;
    }

    // Swap steps
    [steps[index1], steps[index2]] = [steps[index2], steps[index1]];

    // Swap custom step names if provided
    if (customStepNames) {
      this.swapCustomStepNames(customStepNames, index1, index2);
    }
  }

  /**
   * Move step up
   * @param steps - Array of walkthrough steps
   * @param index - Index of step to move up
   * @param customStepNames - Optional custom step names map
   * @returns true if moved, false if invalid
   */
  static moveStepUp(
    steps: RecipeWalkthroughStep[],
    index: number,
    customStepNames?: { [index: number]: string }
  ): boolean {
    if (!steps || index <= 0) return false;
    this.swapSteps(steps, index - 1, index, customStepNames);
    return true;
  }

  /**
   * Move step down
   * @param steps - Array of walkthrough steps
   * @param index - Index of step to move down
   * @param customStepNames - Optional custom step names map
   * @returns true if moved, false if invalid
   */
  static moveStepDown(
    steps: RecipeWalkthroughStep[],
    index: number,
    customStepNames?: { [index: number]: string }
  ): boolean {
    if (!steps || index >= steps.length - 1) return false;
    this.swapSteps(steps, index, index + 1, customStepNames);
    return true;
  }

  /**
   * Swap custom step names between two indexes
   * @param customStepNames - Custom step names map
   * @param index1 - First index
   * @param index2 - Second index
   */
  static swapCustomStepNames(
    customStepNames: { [index: number]: string },
    index1: number,
    index2: number
  ): void {
    if (customStepNames[index1] !== undefined || customStepNames[index2] !== undefined) {
      const temp = customStepNames[index1];
      customStepNames[index1] = customStepNames[index2];
      customStepNames[index2] = temp;

      // Clean up undefined entries
      if (customStepNames[index1] === undefined) {
        delete customStepNames[index1];
      }
      if (customStepNames[index2] === undefined) {
        delete customStepNames[index2];
      }
    }
  }

  /**
   * Reindex custom step names after removal
   * @param steps - Current walkthrough steps
   * @param customStepNames - Custom step names to reindex
   * @returns New reindexed custom step names map
   */
  static reindexCustomStepNames(
    steps: RecipeWalkthroughStep[],
    customStepNames: { [index: number]: string }
  ): { [index: number]: string } {
    const newCustomStepNames: { [index: number]: string } = {};

    steps.forEach((step, index) => {
      if (step.step === 'Custom' && customStepNames[index]) {
        newCustomStepNames[index] = customStepNames[index];
      }
    });

    return newCustomStepNames;
  }
}
