import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ClipboardUtil } from '../../shared/utils/clipboard.util';

@Component({
  selector: 'app-recipe-step',
  templateUrl: './recipe-step.component.html',
  styleUrls: ['./recipe-step.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeStepComponent {
  @Input() stepData: any;
  @Input() stepId!: string;

  /**
   * Check if a field is a boolean field (ends with ?)
   */
  isBoolean(fieldName: string): boolean {
    return !!(fieldName && fieldName.endsWith('?'));
  }

  /**
   * Check if a value represents true (case-insensitive)
   */
  isTrueValue(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return false;
  }

  copyToClipboard(event: Event, text: string): void {
    event.stopPropagation();
    ClipboardUtil.copyToClipboard(text);
  }
}