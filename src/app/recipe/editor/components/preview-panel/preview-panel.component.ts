import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

/**
 * Preview Panel Component
 *
 * Displays JSON preview of the current recipe:
 * - Formatted JSON output
 * - Copy to clipboard button
 * - Open in new tab button
 *
 * The JSON is cleaned (displayUrl and internal fields removed)
 * to match the export format.
 */
@Component({
  selector: 'app-preview-panel',
  templateUrl: './preview-panel.component.html',
  styleUrls: ['./preview-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PreviewPanelComponent {
  @Input() jsonPreview: string = '';
  @Output() copyToClipboard = new EventEmitter<string>();
  @Output() openPreviewInNewTab = new EventEmitter<void>();

  // ==================== Actions ====================

  /**
   * Copy JSON to clipboard
   */
  onCopyToClipboard(): void {
    this.copyToClipboard.emit(this.jsonPreview);
  }

  /**
   * Open preview in new tab
   */
  onOpenPreviewInNewTab(): void {
    this.openPreviewInNewTab.emit();
  }
}
