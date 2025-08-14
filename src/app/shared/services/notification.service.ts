import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export enum NotificationType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info'
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private snackBar: MatSnackBar) {}

  private getConfig(type: NotificationType, duration = 4000): MatSnackBarConfig {
    return {
      duration: duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`snackbar-${type}`]
    };
  }

  success(message: string, action = 'Close', duration?: number): void {
    this.snackBar.open(message, action, this.getConfig(NotificationType.Success, duration));
  }

  error(message: string, action = 'Close', duration?: number): void {
    this.snackBar.open(message, action, this.getConfig(NotificationType.Error, duration || 6000));
  }

  warning(message: string, action = 'Close', duration?: number): void {
    this.snackBar.open(message, action, this.getConfig(NotificationType.Warning, duration));
  }

  info(message: string, action = 'Close', duration?: number): void {
    this.snackBar.open(message, action, this.getConfig(NotificationType.Info, duration));
  }

  // Special methods for FAQ Editor
  saveSuccess(faqTitle: string): void {
    this.success(`✓ ${faqTitle} saved successfully`, 'Close', 3000);
  }

  saveError(faqTitle: string, error?: string): void {
    const message = error 
      ? `✗ Failed to save ${faqTitle}: ${error}`
      : `✗ Failed to save ${faqTitle}`;
    this.error(message, 'Close', 5000);
  }

  exportSuccess(fileCount: number): void {
    this.success(`✓ Successfully exported ${fileCount} files`, 'Close', 4000);
  }

  exportError(error: string): void {
    this.error(`✗ Export failed: ${error}`, 'Close', 6000);
  }

  resetWarning(faqTitle: string): void {
    this.warning(`⚠ "${faqTitle}" has been reset to original content`, 'Close', 4000);
  }

  autoSave(faqTitle: string): void {
    this.info(`💾 Auto-saved: ${faqTitle}`, '', 2000);
  }
}