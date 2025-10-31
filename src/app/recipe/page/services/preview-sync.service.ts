import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { RecipePreviewService, RecipePreviewData } from '../../core/services/preview.service';
import { RecipeLoggerService } from '../../core/services/logger.service';
import { RecipeItem } from '../../core/models/recipe.model';

/**
 * Preview update event
 */
export interface PreviewUpdateEvent {
  type: 'content-updated';
  recipe: RecipeItem;
  previewData: RecipePreviewData;
}

/**
 * Service to manage recipe preview synchronization across tabs
 * Handles cross-tab communication and periodic polling for preview updates
 */
@Injectable({
  providedIn: 'root'
})
export class RecipePreviewSyncService {

  private updateEvent$ = new Subject<PreviewUpdateEvent>();
  private storageEventListener?: (event: StorageEvent) => void;
  private updateInterval?: number;
  private currentRecipeId?: string;
  private currentTimestamp: number = 0;

  constructor(
    private previewService: RecipePreviewService,
    private logger: RecipeLoggerService
  ) {}

  // ==================== Event Observables ====================

  /**
   * Get preview update events
   */
  getUpdateEvents(): Observable<PreviewUpdateEvent> {
    return this.updateEvent$.asObservable();
  }

  // ==================== Preview Sync Setup ====================

  /**
   * Setup preview synchronization for cross-tab updates
   */
  setupPreviewSync(recipeId: string): void {
    // Clean up any existing sync
    this.cleanup();

    this.currentRecipeId = recipeId;

    // Setup storage event listener for cross-tab communication
    this.setupStorageListener(recipeId);

    // Setup periodic polling as fallback mechanism
    this.setupPeriodicPolling(recipeId);
  }

  /**
   * Setup storage event listener for cross-tab communication
   */
  private setupStorageListener(recipeId: string): void {
    if (typeof window === 'undefined') return;

    this.storageEventListener = (event: StorageEvent) => {
      const sessionKey = `recipe-preview-${recipeId}`;
      const backupKey = `backup-recipe-preview-${recipeId}`;

      // Check both sessionStorage and localStorage keys
      if ((event.key === sessionKey || event.key === backupKey) && event.newValue) {
        try {
          const previewData = JSON.parse(event.newValue) as RecipePreviewData;
          this.handlePreviewUpdate(previewData);
        } catch (error) {
          this.logger.error('Error parsing recipe preview update data', error);
        }
      }
    };

    window.addEventListener('storage', this.storageEventListener);
  }

  /**
   * Setup periodic polling for preview updates (fallback mechanism)
   */
  private setupPeriodicPolling(recipeId: string): void {
    if (typeof window === 'undefined') return;

    this.updateInterval = window.setInterval(() => {
      this.checkForPreviewUpdates(recipeId);
    }, 1000);
  }

  // ==================== Preview Update Handling ====================

  /**
   * Handle preview update from storage event or polling
   */
  private handlePreviewUpdate(previewData: RecipePreviewData): void {
    // Convert preview data to RecipeItem
    const recipe = this.convertPreviewToRecipeItem(previewData);

    // Update timestamp
    this.currentTimestamp = previewData.timestamp;

    // Update page title
    if (typeof document !== 'undefined') {
      document.title = `[Preview] ${previewData.title} - Data Sync Pro Recipes`;
    }

    // Emit update event
    this.updateEvent$.next({
      type: 'content-updated',
      recipe,
      previewData
    });
  }

  /**
   * Check for preview updates via periodic polling
   */
  private checkForPreviewUpdates(recipeId: string): void {
    const currentData = this.previewService.getPreviewData(recipeId);
    if (!currentData) return;

    // Check if timestamp is newer
    if (currentData.timestamp > this.currentTimestamp) {
      this.handlePreviewUpdate(currentData);
    }
  }

  // ==================== Preview Data Conversion ====================

  /**
   * Convert preview data to RecipeItem format
   */
  convertPreviewToRecipeItem(previewData: RecipePreviewData): RecipeItem {
    const sourceRecipe = previewData.recipeData;

    return {
      id: sourceRecipe.id,
      title: sourceRecipe.title,
      category: sourceRecipe.category,
      DSPVersions: sourceRecipe.DSPVersions,
      overview: sourceRecipe.overview,
      whenToUse: sourceRecipe.whenToUse,
      generalImages: sourceRecipe.generalImages,
      prerequisites: sourceRecipe.prerequisites,
      direction: sourceRecipe.direction,
      connection: sourceRecipe.connection,
      walkthrough: sourceRecipe.walkthrough,
      downloadableExecutables: sourceRecipe.downloadableExecutables,
      relatedRecipes: sourceRecipe.relatedRecipes,
      keywords: sourceRecipe.keywords
    };
  }

  // ==================== Timestamp Management ====================

  /**
   * Set current preview timestamp
   */
  setCurrentTimestamp(timestamp: number): void {
    this.currentTimestamp = timestamp;
  }

  /**
   * Get current preview timestamp
   */
  getCurrentTimestamp(): number {
    return this.currentTimestamp;
  }

  // ==================== Cleanup ====================

  /**
   * Cleanup preview sync resources
   */
  cleanup(): void {
    // Remove storage event listener
    if (this.storageEventListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageEventListener);
      this.storageEventListener = undefined;
    }

    // Clear update interval
    if (this.updateInterval !== undefined) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    // Reset state
    this.currentRecipeId = undefined;
    this.currentTimestamp = 0;
  }
}
