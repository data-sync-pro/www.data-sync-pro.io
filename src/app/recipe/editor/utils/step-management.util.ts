import { WalkthroughStep } from '../../core/models/recipe.model';

export class StepManagementUtil {
  static swapSteps(
    steps: WalkthroughStep[],
    index1: number,
    index2: number,
    customStepNames?: { [index: number]: string }
  ): void {
    if (!steps || index1 < 0 || index2 < 0 || index1 >= steps.length || index2 >= steps.length) {
      return;
    }

    [steps[index1], steps[index2]] = [steps[index2], steps[index1]];

    if (customStepNames) {
      this.swapCustomStepNames(customStepNames, index1, index2);
    }
  }

  static moveStepUp(
    steps: WalkthroughStep[],
    index: number,
    customStepNames?: { [index: number]: string }
  ): boolean {
    if (!steps || index <= 0) return false;
    this.swapSteps(steps, index - 1, index, customStepNames);
    return true;
  }

  static moveStepDown(
    steps: WalkthroughStep[],
    index: number,
    customStepNames?: { [index: number]: string }
  ): boolean {
    if (!steps || index >= steps.length - 1) return false;
    this.swapSteps(steps, index, index + 1, customStepNames);
    return true;
  }

  static swapCustomStepNames(
    customStepNames: { [index: number]: string },
    index1: number,
    index2: number
  ): void {
    if (customStepNames[index1] !== undefined || customStepNames[index2] !== undefined) {
      const temp = customStepNames[index1];
      customStepNames[index1] = customStepNames[index2];
      customStepNames[index2] = temp;

      if (customStepNames[index1] === undefined) {
        delete customStepNames[index1];
      }
      if (customStepNames[index2] === undefined) {
        delete customStepNames[index2];
      }
    }
  }

  static reindexCustomStepNames(
    steps: WalkthroughStep[],
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
