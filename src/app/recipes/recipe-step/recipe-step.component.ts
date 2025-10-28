import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

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
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        // Successfully copied
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
      document.body.removeChild(textArea);
    }
  }
}