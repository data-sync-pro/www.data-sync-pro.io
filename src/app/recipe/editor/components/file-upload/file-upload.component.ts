import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { RecipeDownloadableExecutable } from '../../../core/models/recipe.model';
import { TrackByUtil } from '../../../../shared/utils/trackby.util';
import { RecipeFileStorageService } from '../../services/file-storage.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { RecipeLoggerService } from '../../../core/services/logger.service';

/**
 * File Upload Component
 *
 * Handles Downloadable Executables JSON file uploads:
 * - Drag and drop upload
 * - Click to upload
 * - File validation
 * - IndexedDB storage
 * - Add/Remove executables
 *
 * Files are stored in IndexedDB with path format:
 * "downloadExecutables/{filename}.json"
 */
@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileUploadComponent {
  @Input() downloadableExecutables: RecipeDownloadableExecutable[] = [];
  @Output() downloadableExecutablesChange = new EventEmitter<void>();

  constructor(
    private fileStorageService: RecipeFileStorageService,
    private notificationService: NotificationService,
    private logger: RecipeLoggerService
  ) {}

  // ==================== Change Handler ====================

  /**
   * Notify parent of changes
   */
  onChange(): void {
    this.downloadableExecutablesChange.emit();
  }

  // ==================== Executables Management ====================

  /**
   * Add new downloadable executable
   */
  addDownloadableExecutable(): void {
    const newExecutable: RecipeDownloadableExecutable = {
      filePath: ''
    };

    this.downloadableExecutables.push(newExecutable);
    this.onChange();
  }

  /**
   * Remove downloadable executable at index
   */
  async removeDownloadableExecutable(index: number): Promise<void> {
    if (!this.downloadableExecutables) return;

    const executable = this.downloadableExecutables[index];

    // Delete from IndexedDB if it has a file
    if (executable.filePath) {
      const fileName = this.getJsonFileName(executable);
      await this.fileStorageService.deleteJsonFile(fileName);
    }

    this.downloadableExecutables.splice(index, 1);
    this.onChange();
  }

  // ==================== File Upload Handlers ====================

  /**
   * Handle file drop event
   */
  async onJsonFileDrop(event: DragEvent, index: number): Promise<void> {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await this.handleJsonFileUpload(file, index);
  }

  /**
   * Handle drag over event
   */
  onJsonFileDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const uploadArea = target.closest('.json-upload-area');
    if (uploadArea) {
      uploadArea.classList.add('drag-over');
    }
  }

  /**
   * Handle drag leave event
   */
  onJsonFileDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const uploadArea = target.closest('.json-upload-area');
    if (uploadArea) {
      uploadArea.classList.remove('drag-over');
    }
  }

  /**
   * Trigger file input click
   */
  triggerJsonFileInput(index: number): void {
    const fileInput = document.querySelector(`#json-upload-${index}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Handle file select from input
   */
  async onJsonFileSelect(event: Event, index: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    await this.handleJsonFileUpload(file, index);

    // Reset input
    input.value = '';
  }

  /**
   * Get JSON file name from executable
   */
  getJsonFileName(executable: RecipeDownloadableExecutable): string {
    if (!executable.filePath) return '';
    return executable.filePath.replace('downloadExecutables/', '');
  }

  // ==================== File Processing ====================

  /**
   * Handle JSON file upload
   * Validates, stores in IndexedDB, and updates executable reference
   */
  private async handleJsonFileUpload(file: File, index: number): Promise<void> {
    if (!this.downloadableExecutables?.[index]) return;

    // Validate file
    const validation = this.fileStorageService.validateJsonFile(file);
    if (!validation.valid) {
      this.notificationService.error(validation.error!);
      return;
    }

    try {
      // Validate JSON content
      const jsonContent = await this.readFileAsText(file);
      try {
        JSON.parse(jsonContent);
      } catch (jsonError) {
        this.notificationService.error('Invalid JSON file format');
        return;
      }

      // Sanitize filename
      const fileName = this.fileStorageService.sanitizeFileName(file.name);

      // Store JSON file in IndexedDB
      await this.fileStorageService.storeJsonFile(fileName, file);

      // Update executable reference
      this.downloadableExecutables[index].filePath = `downloadExecutables/${fileName}`;
      this.onChange();

      this.notificationService.success(`JSON file uploaded: ${fileName}`);
    } catch (error) {
      this.logger.error('Error uploading JSON file:', error);
      this.notificationService.error('Failed to upload JSON file');
    }
  }

  /**
   * Read file as text
   */
  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  // ==================== Utility Methods ====================

  /**
   * Track by index for ngFor performance
   */
  trackByIndex = TrackByUtil.index;
}
