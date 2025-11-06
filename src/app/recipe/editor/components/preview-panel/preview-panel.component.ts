import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

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

  onCopyToClipboard(): void {
    this.copyToClipboard.emit(this.jsonPreview);
  }

  onOpenPreviewInNewTab(): void {
    this.openPreviewInNewTab.emit();
  }
}
