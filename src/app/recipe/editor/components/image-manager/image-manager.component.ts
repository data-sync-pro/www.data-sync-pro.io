import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { RecipeStepMedia, RecipeGeneralImage } from '../../../core/models/recipe.model';
import { TrackByUtil } from '../../../../shared/utils/trackby.util';
import { RecipeFileStorageService } from '../../services/file-storage.service';
import { RecipeImageNamingService } from '../../services/image-naming.service';
import { RecipeImageLoaderService } from '../../services/image-loader.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { RecipeLoggerService } from '../../../core/services/logger.service';

/**
 * Image Manager Component
 *
 * Handles image/media management for recipe steps and general images:
 * - Upload images (drag & drop, click)
 * - Display image previews
 * - Remove images
 * - Handle missing images
 * - Image validation and storage
 *
 * Images are stored in IndexedDB with meaningful names.
 */
@Component({
  selector: 'app-image-manager',
  templateUrl: './image-manager.component.html',
  styleUrls: ['./image-manager.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageManagerComponent {
  @Input() media: RecipeStepMedia[] = [];
  @Input() generalImages: RecipeGeneralImage[] = [];
  @Input() stepIndex: number = -1; // -1 for general images
  @Input() recipeId: string = '';
  @Input() recipeCategory: string = '';

  @Output() mediaChange = new EventEmitter<void>();
  @Output() generalImagesChange = new EventEmitter<void>();

  constructor(
    private fileStorageService: RecipeFileStorageService,
    private imageNamingService: RecipeImageNamingService,
    private imageLoaderService: RecipeImageLoaderService,
    private notificationService: NotificationService,
    private logger: RecipeLoggerService,
    private cdr: ChangeDetectorRef
  ) {}

  // ==================== Media Management (Step Images) ====================

  /**
   * Add empty media entry
   */
  addMedia(): void {
    const newMedia: RecipeStepMedia = {
      type: 'image',
      url: '',
      alt: ''
    };

    if (!this.media) {
      this.media = [];
    }

    this.media.push(newMedia);
    this.mediaChange.emit();
  }

  /**
   * Remove media at index
   */
  async removeMedia(mediaIndex: number): Promise<void> {
    if (!this.media) return;

    const media = this.media[mediaIndex];

    // Delete from IndexedDB if it's a stored image
    if (media.url && media.url.startsWith('images/')) {
      const baseName = this.imageNamingService.extractBaseNameFromUrl(media.url);
      await this.fileStorageService.deleteImage(baseName);
    }

    this.media.splice(mediaIndex, 1);
    this.mediaChange.emit();
  }

  /**
   * Handle image drop for step media
   */
  async onImageDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await this.handleImageUpload(file);
  }

  /**
   * Handle image file selection
   */
  async handleImageFile(file: File): Promise<void> {
    if (!file) return;
    await this.handleImageUpload(file);
  }

  // ==================== General Images Management ====================

  /**
   * Add empty general image entry
   */
  addGeneralImage(): void {
    const newImage: RecipeGeneralImage = {
      type: 'image',
      url: '',
      alt: ''
    };

    if (!this.generalImages) {
      this.generalImages = [];
    }

    this.generalImages.push(newImage);
    this.generalImagesChange.emit();
  }

  /**
   * Remove general image at index
   */
  async removeGeneralImage(imageIndex: number): Promise<void> {
    if (!this.generalImages) return;

    const image = this.generalImages[imageIndex];

    // Delete from IndexedDB
    if (image.imageId) {
      await this.fileStorageService.deleteImage(image.imageId);
    }

    this.generalImages.splice(imageIndex, 1);
    this.generalImagesChange.emit();

    this.notificationService.success('General image removed');
  }

  /**
   * Handle general image drop
   */
  async onGeneralImageDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await this.handleGeneralImageUpload(file);
  }

  /**
   * Handle general image file selection
   */
  async handleGeneralImageFile(file: File): Promise<void> {
    if (!file) return;
    await this.handleGeneralImageUpload(file);
  }

  // ==================== Image Upload Processing ====================

  /**
   * Handle step media image upload
   */
  private async handleImageUpload(file: File): Promise<void> {
    // Validate file
    const validation = this.fileStorageService.validateImageFile(file);
    if (!validation.valid) {
      this.notificationService.error(validation.error!);
      return;
    }

    try {
      // Generate image name (would need recipe context)
      const baseName = `step-${this.stepIndex}-image-${Date.now()}`;
      const extension = this.imageNamingService.getFileExtension(file);

      // Store in IndexedDB
      await this.fileStorageService.storeImage(baseName, file);

      // Create media entry
      const media: RecipeStepMedia = {
        type: 'image',
        url: `images/${baseName}.${extension}`,
        alt: file.name.replace(/\.[^/.]+$/, '')
      };

      // Load image immediately for preview
      await this.imageLoaderService.loadImageForMedia(media);

      this.media.push(media);
      this.mediaChange.emit();

      this.notificationService.success(`Image uploaded: ${baseName}.${extension}`);

      this.cdr.detectChanges();
    } catch (error) {
      this.logger.error('Error uploading image:', error);
      this.notificationService.error('Failed to upload image');
    }
  }

  /**
   * Handle general image upload
   */
  private async handleGeneralImageUpload(file: File): Promise<void> {
    // Validate file
    const validation = this.fileStorageService.validateImageFile(file);
    if (!validation.valid) {
      this.notificationService.error(validation.error!);
      return;
    }

    try {
      // Generate image name
      const baseName = `general-image-${Date.now()}`;
      const extension = this.imageNamingService.getFileExtension(file);

      // Store in IndexedDB
      await this.fileStorageService.storeImage(baseName, file);

      // Create general image entry
      const generalImage: RecipeGeneralImage = {
        type: 'image',
        url: `images/${baseName}.${extension}`,
        alt: file.name.replace(/\.[^/.]+$/, ''),
        imageId: baseName
      };

      // Load image immediately for preview
      await this.imageLoaderService.loadImageForGeneralImage(generalImage);

      this.generalImages.push(generalImage);
      this.generalImagesChange.emit();

      this.notificationService.success(`General image added: ${baseName}.${extension}`);

      this.cdr.detectChanges();
    } catch (error) {
      this.logger.error('Error uploading general image:', error);
      this.notificationService.error('Failed to upload general image');
    }
  }

  // ==================== Image Status ====================

  /**
   * Check if image is missing from storage
   */
  async isImageMissing(media: RecipeStepMedia | RecipeGeneralImage): Promise<boolean> {
    if (!media.url) return false;
    return await this.imageLoaderService.isMissingImage(media.url);
  }

  /**
   * Get display URL from media
   */
  getDisplayUrl(media: RecipeStepMedia | RecipeGeneralImage): string | undefined {
    return this.imageLoaderService.getDisplayUrl(media);
  }

  /**
   * Check if media has display URL
   */
  hasDisplayUrl(media: RecipeStepMedia | RecipeGeneralImage): boolean {
    return this.imageLoaderService.hasDisplayUrl(media);
  }

  // ==================== Image Error Handling ====================

  /**
   * Handle image loading error
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    this.logger.warn('Failed to load image:', img.src);
  }

  // ==================== Utility Methods ====================

  /**
   * Track by index for ngFor performance
   */
  trackByIndex = TrackByUtil.index;

  /**
   * Notify parent of changes
   */
  onChange(): void {
    if (this.stepIndex >= 0) {
      this.mediaChange.emit();
    } else {
      this.generalImagesChange.emit();
    }
  }
}
