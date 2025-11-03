import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { RecipeStorageService } from './services/storage.service';
import { RecipeExportService } from '../core/services/export.service';
import { RecipeFileStorageService } from './services/file-storage.service';
import { RecipeService } from '../core/services/recipe.service';
import { RecipeLoggerService } from '../core/services/logger.service';
import { NotificationService } from '../../shared/services/notification.service';
import { RecipePreviewService, RecipePreviewData } from '../core/services/preview.service';
import { ClipboardUtil } from '../../shared/utils/clipboard.util';
// New services for refactored architecture
import { RecipeEditorStateService, RecipeTab, EditorState } from './services/state.service';
import { RecipeValidationService } from './services/validation.service';
import { RecipeAutocompleteService } from './services/autocomplete.service';
import { RecipeImageNamingService } from './services/image-naming.service';
import { RecipeImageLoaderService } from './services/image-loader.service';
import { EDITOR_CONSTANTS } from './editor.constants';
import { StepManagementUtil } from './utils/step-management.util';
import { TrackByUtil } from '../../shared/utils/trackby.util';
import {
  RecipeItem,
  SourceRecipeRecord,
  RecipeWalkthroughStep,
  RecipePrerequisiteItem,
  RecipeQuickLink,
  RecipeStepConfig,
  RecipeStepMedia,
  RecipeDownloadableExecutable,
  RecipeRelatedItem,
  RecipeGeneralImage
} from '../core/models/recipe.model';
import { ExportProgress } from '../core/services/export.service';

interface RecipeTitleItem {
  id: string;
  recipeId: string;
  title: string;
}

@Component({
  selector: 'app-recipe-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class RecipeEditorComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;
  
  private destroy$ = new Subject<void>();
  private autoSaveSubject = new Subject<void>();
  private previewUpdateSubject = new Subject<void>();
  private imageNameUpdateTimeout: any;
  
  // Recipe list from assets
  recipeList: RecipeItem[] = [];
  filteredRecipes: RecipeItem[] = [];
  editedRecipeIds = new Set<string>();
  
  // Editor state
  state: EditorState = {
    tabs: [],
    activeTabId: null,
    isLoading: false,
    isSaving: false,
    lastSaved: null,
    isImporting: false,
    importProgress: null
  };
  
  // Search and filter
  searchQuery = '';
  selectedCategory = '';
  categories = ['Batch', 'Trigger', 'Data List', 'Action Button', 'Data Loader', 'General'];
  
  // Current editing recipe
  currentRecipe: SourceRecipeRecord | null = null;
  currentIsActive = true; // Active state for current recipe
  jsonPreview = '';
  
  // Recipe active states from index.json
  private recipeActiveStates = new Map<string, boolean>();

  // Preview update timer
  private previewUpdateTimer: any;

  // Previous title for change detection
  private previousTitle: string = '';
  
  
  // Step expansion state
  expandedSteps: Set<number> = new Set();
  
  // Custom step names storage
  customStepNames: { [index: number]: string } = {};
  
  // Tooltip state
  showTooltip: string | null = null;
  private tooltipHideTimeout: any;
  
  // Step options from Recipe Producer
  stepOptions = [
    'Action',
    'Action Button Settings',
    'Batch Settings',
    'Create Executable',
    'Create Pipeline',
    'Create Scheduler',
    'Data List Settings',
    'Data Loader Settings',
    'Input',
    'Mapping',
    'Match',
    'Preview',
    'Preview Transformed',
    'Retrieve',
    'Scoping',
    'Trigger Settings',
    'Variable',
    'Verify',
    'Custom'
  ];

  constructor(
    private http: HttpClient,
    private recipeService: RecipeService,
    private storageService: RecipeStorageService,
    private exportService: RecipeExportService,
    private fileStorageService: RecipeFileStorageService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private previewService: RecipePreviewService,
    private logger: RecipeLoggerService,
    // New services for refactored architecture
    private editorStateService: RecipeEditorStateService,
    private validationService: RecipeValidationService,
    private autocompleteService: RecipeAutocompleteService,
    private imageNamingService: RecipeImageNamingService,
    private imageLoaderService: RecipeImageLoaderService
  ) {}
  
  ngOnInit(): void {
    this.initializeServices();
    this.loadRecipes();
    this.loadEditedRecipes();
    this.setupAutoSave();
    this.setupPreviewUpdate();
    this.createNewTab();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Save any pending changes
    if (this.hasUnsavedChanges()) {
      this.saveAllTabs();
    }

    // Clean up all timeouts to prevent memory leaks
    this.clearTimeoutSafely(this.imageNameUpdateTimeout);
    this.clearTimeoutSafely(this.previewUpdateTimer);
    this.clearTimeoutSafely(this.tooltipHideTimeout);
  }

  /**
   * Safely clear a timeout and nullify the reference
   */
  private clearTimeoutSafely(timeout: any): void {
    if (timeout) {
      clearTimeout(timeout);
    }
  }

  /**
   * Truncate title to specified length with ellipsis
   */
  private truncateTitle(title: string, maxLength: number): string {
    return title.length > maxLength
      ? title.substring(0, maxLength) + '...'
      : title;
  }


  /**
   * Get filtered recipes based on criteria (created vs edited existing)
   * @param isCreated - true for new recipes, false for edited existing recipes, undefined for all
   */
  private getFilteredRecipes(isCreated?: boolean): SourceRecipeRecord[] {
    const editedRecipes = this.storageService.getAllEditedRecipes();

    if (isCreated === undefined) {
      return editedRecipes;
    }

    const originalRecipeIds = new Set(this.recipeList.map(r => r.id));

    return editedRecipes.filter(recipe => {
      if (!recipe.id) return false;
      const isNew = !originalRecipeIds.has(recipe.id);
      return isCreated ? isNew : !isNew;
    });
  }

  /**
   * Convert recipes to title items for tooltips
   */
  private recipesToTitleItems(recipes: SourceRecipeRecord[], maxLength: number): RecipeTitleItem[] {
    const items: RecipeTitleItem[] = recipes
      .filter(recipe => recipe.id && recipe.title)
      .map(recipe => ({
        id: recipe.id,
        recipeId: recipe.id,
        title: this.truncateTitle(recipe.title, maxLength)
      }));

    return items
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, EDITOR_CONSTANTS.MAX_TOOLTIP_ITEMS);
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    
    // Ctrl+S or Cmd+S for save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.saveCurrentTab();
    }
    
    // Ctrl+N for new tab
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      this.createNewTab();
    }
  }

  // Close autocomplete when clicking outside
  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Don't close if clicking on config field or autocomplete dropdown
    if (target.closest('.config-field') || target.closest('.autocomplete-dropdown')) {
      return;
    }
  }

  /**
   * Sort recipes by category first, then by title A-Z
   */
  private sortRecipesByCategoryAndTitle(recipes: RecipeItem[]): RecipeItem[] {
    return [...recipes].sort((a, b) => {
      // Primary sort: by category
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) {
        return categoryCompare;
      }
      // Secondary sort: by title A-Z within same category
      return a.title.localeCompare(b.title);
    });
  }

  private async initializeServices(): Promise<void> {
    await this.fileStorageService.init();
  }
  
  private loadRecipes(): void {
    // Load both recipes and active states
    this.loadRecipeActiveStates();
    
    this.recipeService.getRecipes()
      .pipe(takeUntil(this.destroy$))
      .subscribe(recipes => {
        this.recipeList = recipes;
        this.filteredRecipes = this.sortRecipesByCategoryAndTitle(recipes);
      });
  }
  
  private loadRecipeActiveStates(): void {
    this.http.get<{recipes: {folderId: string, active: boolean}[]}>('assets/recipes/index.json')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (indexData) => {
          this.recipeActiveStates.clear();
          indexData.recipes.forEach(item => {
            this.recipeActiveStates.set(item.folderId, item.active);
          });
        },
        error: (error) => {
          this.logger.error('Failed to load recipe active states', error);
        }
      });
  }
  
  private loadEditedRecipes(): void {
    const editedIds = this.storageService.getEditedRecipeIds();
    this.editedRecipeIds = new Set(editedIds);
    
    // Load saved tabs from storage
    const savedTabs = this.storageService.getSavedTabs();
    if (savedTabs && savedTabs.length > 0) {
      this.state.tabs = savedTabs;
      this.state.activeTabId = savedTabs[0].id;
      this.selectTab(savedTabs[0].id);
    }
  }
  
  private setupAutoSave(): void {
    this.autoSaveSubject.pipe(
      debounceTime(EDITOR_CONSTANTS.AUTO_SAVE_DEBOUNCE_MS),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.saveCurrentTab(true);
    });
  }
  
  private setupPreviewUpdate(): void {
    this.previewUpdateSubject.pipe(
      debounceTime(EDITOR_CONSTANTS.PREVIEW_UPDATE_DEBOUNCE_MS),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateJsonPreview();
    });
  }
  
  private triggerPreviewUpdate(): void {
    this.previewUpdateSubject.next();
  }
  
  private triggerCrossTabPreviewUpdate(): void {
    if (!this.currentRecipe) return;
    
    // Use cleanRecipeForExport to handle Custom step names properly
    const cleanedRecipe = this.cleanRecipeForExport(this.currentRecipe);
    
    const previewData: RecipePreviewData = {
      recipeId: cleanedRecipe.id,
      title: cleanedRecipe.title,
      category: cleanedRecipe.category,
      recipeData: cleanedRecipe,
      timestamp: Date.now()
    };
    
    // Update preview data for cross-tab sync
    this.previewService.updatePreviewData(previewData);
  }
  
  // Tab management
  createNewTab(): void {
    const newRecipe = this.createEmptyRecipe();
    const tab: RecipeTab = {
      id: this.generateUUID(),
      title: 'New Recipe',
      recipe: newRecipe,
      hasChanges: false,
      isActive: true
    };

    // Use StateService to add tab
    this.editorStateService.addTab(tab);

    this.currentRecipe = newRecipe;
    this.previousTitle = newRecipe.title || ''; // Initialize previous title for new recipe
    this.initializeExpandedSteps();
    this.triggerPreviewUpdate();
  }
  
  selectTab(tabId: string): void {
    // Save current tab if has changes
    const currentTab = this.getCurrentTab();
    if (currentTab && currentTab.hasChanges) {
      this.saveTab(currentTab);
    }

    // Use StateService to switch tab
    const success = this.editorStateService.selectTab(tabId);
    if (!success) return;

    const tab = this.editorStateService.getCurrentTab();
    if (!tab) return;

    this.currentRecipe = tab.recipe;
    this.currentIsActive = this.isRecipeActive(tab.recipe.id);
    this.previousTitle = tab.recipe.title || ''; // Initialize previous title
    this.initializeExpandedSteps();
    this.triggerPreviewUpdate();

    // Load all images for this recipe tab
    this.imageLoaderService.loadAllImagesForRecipe(tab.recipe);
  }
  
  closeTab(tabId: string): void {
    const tab = this.editorStateService.getTabById(tabId);
    if (!tab) return;

    // Confirm if has unsaved changes
    if (tab.hasChanges) {
      if (!confirm('This tab has unsaved changes. Close anyway?')) {
        return;
      }
    }

    // Use StateService to remove tab (returns next tab index to activate)
    const wasActive = tab.isActive;
    const nextIndex = this.editorStateService.removeTab(tabId);

    // If was active tab, activate another
    if (wasActive && this.editorStateService.getTabCount() > 0) {
      const tabs = this.editorStateService.getTabs();
      const newActiveTabId = tabs[nextIndex]?.id;
      if (newActiveTabId) {
        this.selectTab(newActiveTabId);
      }
    }

    // Create new tab if no tabs left
    if (this.editorStateService.getTabCount() === 0) {
      this.createNewTab();
    }
  }
  
  // Recipe list interactions
  loadRecipeToEditor(recipe: RecipeItem): void {
    // Check if already open in a tab
    const existingTab = this.state.tabs.find(t => t.recipe.id === recipe.id);
    if (existingTab) {
      this.selectTab(existingTab.id);
      return;
    }
    
    // Load full recipe data
    this.state.isLoading = true;
    this.recipeService.getRecipeById(recipe.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fullRecipe) => {
          const sourceRecipe = this.convertToSourceRecord(fullRecipe);
          
          // Check for edited version
          const editedRecipe = this.storageService.getEditedRecipe(recipe.id);
          if (editedRecipe) {
            Object.assign(sourceRecipe, editedRecipe);
          }
          
          // Create new tab
          const tab: RecipeTab = {
            id: this.generateUUID(),
            title: sourceRecipe.title,
            recipe: sourceRecipe,
            hasChanges: false,
            isActive: true
          };
          
          // Deactivate other tabs
          this.state.tabs.forEach(t => t.isActive = false);
          
          this.state.tabs.push(tab);
          this.state.activeTabId = tab.id;
          this.currentRecipe = sourceRecipe;
          this.currentIsActive = this.isRecipeActive(sourceRecipe.id);
          this.previousTitle = sourceRecipe.title || ''; // Initialize previous title for loaded recipe
          this.initializeExpandedSteps();
          this.triggerPreviewUpdate();
          this.state.isLoading = false;
          
          // Load all images for this recipe
          this.imageLoaderService.loadAllImagesForRecipe(sourceRecipe);
        },
        error: (error) => {
          this.logger.error('Error loading recipe:', error);
          this.notificationService.error('Failed to load recipe');
          this.state.isLoading = false;
        }
      });
  }
  
  filterRecipes(): void {
    const filteredResults = this.recipeList.filter(recipe => {
      const matchesSearch = !this.searchQuery || 
        recipe.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        recipe.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesCategory = !this.selectedCategory || 
        recipe.category === this.selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
    
    this.filteredRecipes = this.sortRecipesByCategoryAndTitle(filteredResults);
  }
  
  isRecipeEdited(recipeId: string): boolean {
    return this.editedRecipeIds.has(recipeId);
  }
  
  isRecipeActive(recipeId: string): boolean {
    return this.recipeActiveStates.get(recipeId) ?? true; // Default to true if not found
  }

  /**
   * Handle active status change from basic-info component
   */
  onActiveStatusChange(isActive: boolean): void {
    this.currentIsActive = isActive;

    // Update in recipeActiveStates map
    if (this.currentRecipe?.id) {
      this.recipeActiveStates.set(this.currentRecipe.id, isActive);
    }

    // Mark as changed
    this.onRecipeChange();
  }

  // Recipe editing
  onRecipeChange(): void {
    this.updateCurrentTabState();
    this.scheduleImageNameUpdate();
    this.triggerPreviewUpdates();
  }

  /**
   * Update current tab state with recipe changes
   */
  private updateCurrentTabState(): void {
    const tab = this.getCurrentTab();
    if (!tab) return;

    // Mark tab as changed and update recipe
    this.editorStateService.markTabAsChanged(tab.id);
    this.editorStateService.updateTab(tab.id, { recipe: this.currentRecipe! });

    // Handle title change
    this.handleRecipeTitleChange(tab);
  }

  /**
   * Handle recipe title change and ID generation
   */
  private handleRecipeTitleChange(tab: RecipeTab): void {
    if (!this.currentRecipe?.title || this.currentRecipe.title === this.previousTitle) {
      return;
    }

    // Update tab title
    this.editorStateService.updateTab(tab.id, { title: this.currentRecipe.title });

    // Generate UUID if needed
    if (this.currentRecipe.id && !this.isUUID(this.currentRecipe.id)) {
      const oldId = this.currentRecipe.id;
      const newId = this.generateUUID();
      this.currentRecipe.id = newId;
      this.logger.debug(`Recipe ID updated from "${oldId}" to "${newId}" due to title change`);
    }

    this.previousTitle = this.currentRecipe.title;
  }

  /**
   * Schedule image name update with debounce
   */
  private scheduleImageNameUpdate(): void {
    if (this.imageNameUpdateTimeout) {
      clearTimeout(this.imageNameUpdateTimeout);
    }

    this.imageNameUpdateTimeout = setTimeout(() => {
      this.updateImageNamesForContentChange();
    }, EDITOR_CONSTANTS.IMAGE_NAME_UPDATE_DEBOUNCE_MS);
  }

  /**
   * Trigger all preview updates
   */
  private triggerPreviewUpdates(): void {
    this.triggerPreviewUpdate();
    this.autoSaveSubject.next();
    this.triggerCrossTabPreviewUpdate();
  }
  
  // Step management
  addStep(): void {
    if (!this.currentRecipe) return;
    
    const newStep: RecipeWalkthroughStep = {
      step: '',
      config: [],
      media: []
    };
    
    if (!this.currentRecipe.walkthrough) {
      this.currentRecipe.walkthrough = [];
    }
    
    this.currentRecipe.walkthrough.push(newStep);
    
    // Expand the new step by default
    const newStepIndex = this.currentRecipe.walkthrough.length - 1;
    this.expandedSteps.add(newStepIndex);
    
    this.onRecipeChange();
  }
  
  removeStep(index: number): void {
    if (!this.currentRecipe?.walkthrough) return;
    
    this.currentRecipe.walkthrough.splice(index, 1);
    
    // Update custom step names indexes
    this.reindexCustomStepNames();
    
    this.onRecipeChange();
  }
  
  moveStepUp(index: number): void {
    if (!this.currentRecipe?.walkthrough) return;
    if (StepManagementUtil.moveStepUp(this.currentRecipe.walkthrough, index, this.customStepNames)) {
      this.onRecipeChange();
    }
  }

  moveStepDown(index: number): void {
    if (!this.currentRecipe?.walkthrough) return;
    if (StepManagementUtil.moveStepDown(this.currentRecipe.walkthrough, index, this.customStepNames)) {
      this.onRecipeChange();
    }
  }
  
  // Config management
  addConfig(stepIndex: number): void {
    if (!this.currentRecipe?.walkthrough?.[stepIndex]) return;
    
    const newConfig: RecipeStepConfig = {
      field: '',
      value: ''
    };
    
    this.currentRecipe.walkthrough[stepIndex].config.push(newConfig);
    this.onRecipeChange();
  }
  
  removeConfig(stepIndex: number, configIndex: number): void {
    if (!this.currentRecipe?.walkthrough?.[stepIndex]) return;
    
    this.currentRecipe.walkthrough[stepIndex].config.splice(configIndex, 1);
    this.onRecipeChange();
  }
  
  // Media management
  addMedia(stepIndex: number): void {
    if (!this.currentRecipe?.walkthrough?.[stepIndex]) return;
    
    const newMedia: RecipeStepMedia = {
      type: 'image',
      url: '',
      alt: ''
    };
    
    if (!this.currentRecipe.walkthrough[stepIndex].media) {
      this.currentRecipe.walkthrough[stepIndex].media = [];
    }
    
    this.currentRecipe.walkthrough[stepIndex].media.push(newMedia);
    this.onRecipeChange();
  }
  
  async onImageDrop(event: DragEvent, stepIndex: number): Promise<void> {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
      await this.handleImageFile(files[i], stepIndex);
    }
  }
  
  async handleImageFile(file: File, stepIndex: number): Promise<void> {
    if (!this.currentRecipe?.walkthrough?.[stepIndex]) return;
    await this.uploadImageFile(file, 'step-media', { stepIndex });
  }

  /**
   * Unified image upload logic for all image upload operations
   */
  private async uploadImageFile(
    file: File,
    purpose: 'step-media' | 'general-image' | 'replace-step-media' | 'replace-general-image',
    options: {
      stepIndex?: number;
      existingObject?: any;
      targetInput?: HTMLInputElement;
    } = {}
  ): Promise<void> {
    // Validate file
    const validation = this.fileStorageService.validateImageFile(file);
    if (!validation.valid) {
      this.notificationService.error(validation.error || 'Invalid file');
      return;
    }

    try {
      const { baseName, fullFileName } = this.generateImageFileName(file, purpose, options);

      // Store image in IndexedDB
      await this.fileStorageService.storeImage(baseName, file);

      // Generate displayUrl immediately
      const displayUrl = URL.createObjectURL(file);

      // Update recipe with image
      this.updateRecipeWithImage(purpose, options, baseName, fullFileName, displayUrl, file);

      // Cleanup and notify
      this.finalizeImageUpload(options.targetInput);
    } catch (error) {
      this.logger.error('Error uploading image:', error);
      this.notificationService.error('Failed to upload image');
    }
  }

  /**
   * Generate image file name based on purpose
   */
  private generateImageFileName(
    file: File,
    purpose: string,
    options: { stepIndex?: number }
  ): { baseName: string; fullFileName: string } {
    let baseName: string;
    let fullFileName: string;

    if (purpose === 'step-media') {
      baseName = this.imageNamingService.generateImageName(file, this.currentRecipe!, options.stepIndex!);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      fullFileName = `${baseName}.${extension}`;
    } else if (purpose === 'general-image') {
      baseName = this.imageNamingService.generateGeneralImageName(file, this.currentRecipe!);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      fullFileName = `${baseName}.${extension}`;
    } else {
      // For replace operations, use random ID
      const imageId = this.fileStorageService.generateImageId();
      const originalName = this.fileStorageService.sanitizeFileName(file.name);
      baseName = imageId;
      fullFileName = `${imageId}_${originalName}`;
    }

    return { baseName, fullFileName };
  }

  /**
   * Update recipe with uploaded image
   */
  private updateRecipeWithImage(
    purpose: string,
    options: { stepIndex?: number; existingObject?: any },
    baseName: string,
    fullFileName: string,
    displayUrl: string,
    file: File
  ): void {
    if (purpose === 'step-media') {
      const media: RecipeStepMedia = {
        type: 'image',
        url: `images/${fullFileName}`,
        alt: file.name.replace(/\.[^/.]+$/, '')
      };
      (media as any).displayUrl = displayUrl;
      this.currentRecipe!.walkthrough[options.stepIndex!].media.push(media);
    } else if (purpose === 'general-image') {
      const generalImage: RecipeGeneralImage = {
        type: 'image',
        url: `images/${fullFileName}`,
        alt: file.name.replace(/\.[^/.]+$/, ''),
        imageId: baseName
      };
      (generalImage as any).displayUrl = displayUrl;
      if (!this.currentRecipe!.generalImages) {
        this.currentRecipe!.generalImages = [];
      }
      this.currentRecipe!.generalImages.push(generalImage);
    } else if (purpose === 'replace-step-media' || purpose === 'replace-general-image') {
      options.existingObject!.url = `images/${fullFileName}`;
      (options.existingObject as any).displayUrl = displayUrl;
    }
  }

  /**
   * Finalize image upload (cleanup and notifications)
   */
  private finalizeImageUpload(targetInput?: HTMLInputElement): void {
    if (targetInput) {
      targetInput.value = '';
    }

    this.onRecipeChange();
    this.notificationService.success('Image uploaded successfully');
    this.cdr.detectChanges();
  }

  removeMedia(stepIndex: number, mediaIndex: number): void {
    if (!this.currentRecipe?.walkthrough?.[stepIndex]) return;
    
    const media = this.currentRecipe.walkthrough[stepIndex].media[mediaIndex];
    
    // Delete from IndexedDB if it's a stored image
    if (media.url.startsWith('images/')) {
      const fileName = media.url.replace('images/', '');
      // For step media, the storage key is the base name (without extension)
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      this.fileStorageService.deleteImage(baseName);
    }
    
    this.currentRecipe.walkthrough[stepIndex].media.splice(mediaIndex, 1);
    this.onRecipeChange();
  }
  
  trackByIndex = TrackByUtil.index;
  
  async copyToClipboard(text: string): Promise<void> {
    const success = await ClipboardUtil.copyToClipboard(text);
    if (success) {
      this.notificationService.success('JSON copied to clipboard');
    } else {
      this.notificationService.error('Failed to copy to clipboard');
    }
  }

  /**
   * Handle autocomplete value selection from directive
   */
  public onAutocompleteSelect(value: string, stepIndex: number, configIndex: number): void {
    if (this.currentRecipe?.walkthrough?.[stepIndex]?.config?.[configIndex]) {
      this.currentRecipe.walkthrough[stepIndex].config[configIndex].field = value;
      this.onRecipeChange();
      this.cdr.markForCheck();
    }
  }

  /**
   * Get field suggestions based on step type
   * Delegates to AutocompleteService
   */
  getFieldSuggestions(stepType: string): string[] {
    return this.autocompleteService.getFieldSuggestions(stepType);
  }

  // Step expansion management
  toggleStep(index: number): void {
    if (this.expandedSteps.has(index)) {
      this.expandedSteps.delete(index);
    } else {
      this.expandedSteps.add(index);
    }
  }
  
  isStepExpanded(index: number): boolean {
    return this.expandedSteps.has(index);
  }
  
  getStepTitle(step: any, index: number): string {
    if (step.step && step.step.trim() !== '') {
      if (step.step === 'Custom') {
        // Return custom name if available, otherwise default
        return this.customStepNames[index] || 'Custom Step';
      }
      return step.step;
    }
    return `Step ${index + 1}`;
  }
  
  private initializeExpandedSteps(): void {
    this.expandedSteps.clear();
    this.customStepNames = {};
    
    if (this.currentRecipe?.walkthrough) {
      // All steps are expanded by default and restore custom step names
      for (let i = 0; i < this.currentRecipe.walkthrough.length; i++) {
        this.expandedSteps.add(i);
        
        // Restore custom step names - check if step is not in predefined options
        const step = this.currentRecipe.walkthrough[i];
        if (step.step && !this.stepOptions.includes(step.step)) {
          // This is a custom step - store the name and set step to 'Custom'
          this.customStepNames[i] = step.step;
          step.step = 'Custom';
        }
      }
    }
  }
  
  onStepSelectionChange(step: any, index: number): void {
    if (step.step === 'Custom') {
      // Initialize custom name if not exists
      if (!this.customStepNames[index]) {
        this.customStepNames[index] = '';
      }
      // Auto-focus the custom input (will be handled in template)
    } else {
      // Clear custom name if switching away from Custom
      delete this.customStepNames[index];
    }
    this.onRecipeChange();
  }
  
  onCustomStepNameChange(index: number): void {
    this.onRecipeChange();
  }
  
  isCustomStep(step: any): boolean {
    return step.step === 'Custom';
  }
  
  
  private reindexCustomStepNames(): void {
    if (!this.currentRecipe?.walkthrough) return;
    this.customStepNames = StepManagementUtil.reindexCustomStepNames(
      this.currentRecipe.walkthrough,
      this.customStepNames
    );
  }
  
  /**
   * Handle missing step media image - trigger file input
   */
  public handleMissingImage(media: any, stepIndex: number): void {
    const fileInput = document.getElementById(`missing-media-${stepIndex}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Handle missing general image - trigger file input
   */
  public handleMissingGeneralImage(image: any, imageIndex: number): void {
    const fileInput = document.getElementById(`missing-general-${imageIndex}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Replace missing step media image with new upload
   */
  public async replaceMissingImage(event: Event, media: any, stepIndex: number): Promise<void> {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    await this.uploadImageFile(target.files[0], 'replace-step-media', { existingObject: media, targetInput: target });
  }

  /**
   * Replace missing general image with new upload
   */
  public async replaceMissingGeneralImage(event: Event, image: any, imageIndex: number): Promise<void> {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    await this.uploadImageFile(target.files[0], 'replace-general-image', { existingObject: image, targetInput: target });
  }

  // General images management
  addGeneralImage(): void {
    if (!this.currentRecipe) return;

    // Add empty general image entry (like step media)
    const newGeneralImage: RecipeGeneralImage = {
      type: 'image',
      url: '',
      alt: ''
    };

    if (!this.currentRecipe.generalImages) {
      this.currentRecipe.generalImages = [];
    }
    this.currentRecipe.generalImages.push(newGeneralImage);
    this.onRecipeChange();
  }

  async handleGeneralImageFile(file: File): Promise<void> {
    if (!this.currentRecipe) return;
    await this.uploadImageFile(file, 'general-image');
  }

  removeGeneralImage(index: number): void {
    if (!this.currentRecipe?.generalImages) return;
    
    const image = this.currentRecipe.generalImages[index];
    
    // Delete from IndexedDB if it has an imageId
    if (image.imageId) {
      this.fileStorageService.deleteImage(image.imageId);
    }
    
    this.currentRecipe.generalImages.splice(index, 1);
    this.onRecipeChange();
    
    this.notificationService.success('General image removed');
  }

  async onGeneralImageDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
      await this.handleGeneralImageFile(files[i]);
    }
  }
  
  /**
   * Merge original recipe data with edited data
   */
  private mergeRecipeData(originalRecipes: RecipeItem[], editedRecipes: SourceRecipeRecord[]): SourceRecipeRecord[] {
    // Create a map of edited recipes by ID
    const editedMap = new Map<string, SourceRecipeRecord>();
    const processedIds = new Set<string>();

    editedRecipes.forEach(recipe => {
      if (recipe.id) {
        editedMap.set(recipe.id, recipe);
      }
    });

    // Convert original recipes to SourceRecipeRecord and apply edits
    const mergedRecipes = originalRecipes.map(originalRecipe => {
      processedIds.add(originalRecipe.id);
      const editedRecipe = editedMap.get(originalRecipe.id);
      if (editedRecipe) {
        // Use edited version
        return editedRecipe;
      } else {
        // Convert original to SourceRecipeRecord format
        return this.convertToSourceRecord(originalRecipe);
      }
    });

    // Add new recipes that are not in the original list
    editedRecipes.forEach(recipe => {
      if (recipe.id && !processedIds.has(recipe.id)) {
        mergedRecipes.push(recipe);
      }
    });

    return mergedRecipes;
  }

  // Save and export
  saveCurrentTab(isAutoSave = false): void {
    const tab = this.getCurrentTab();
    if (!tab || !tab.hasChanges) return;
    
    this.saveTab(tab);
    
    if (!isAutoSave) {
      this.notificationService.success(`Recipe "${tab.title}" saved`);
    }
  }
  
  private saveTab(tab: RecipeTab): void {
    this.state.isSaving = true;

    // Validate recipe before saving
    const validationResult = this.validationService.validateRecipe(tab.recipe);
    if (!validationResult.valid) {
      const errors = this.validationService.getErrorMessages(validationResult);
      this.logger.warn('Recipe validation failed:', errors);
      this.notificationService.error(`Validation failed:\n${errors.slice(0, EDITOR_CONSTANTS.MAX_ERROR_MESSAGES_SHOWN).join('\n')}`);
      this.state.isSaving = false;
      return;
    }

    // Generate ID if needed
    if (!tab.recipe.id) {
      tab.recipe.id = this.generateRecipeId();
    }
    
    // Clean recipe to permanently save Custom step names
    const cleanedRecipe = this.cleanRecipeForExport(tab.recipe);
    
    // Save cleaned recipe to storage
    this.storageService.saveRecipe(cleanedRecipe);
    this.editedRecipeIds.add(cleanedRecipe.id);
    
    // Update tab with cleaned recipe to ensure consistency
    tab.recipe = cleanedRecipe;
    
    // Save tabs state
    this.storageService.saveTabs(this.state.tabs);
    
    tab.hasChanges = false;
    this.state.lastSaved = new Date();
    this.state.isSaving = false;
  }
  
  saveAllTabs(): void {
    this.state.tabs.forEach(tab => {
      if (tab.hasChanges) {
        this.saveTab(tab);
      }
    });
    
    this.notificationService.success('All recipes saved');
  }
  
  async exportCurrentRecipe(): Promise<void> {
    const tab = this.getCurrentTab();
    if (!tab) return;
    
    // Save first if has changes
    if (tab.hasChanges) {
      this.saveTab(tab);
    }
    
    // Use cleanRecipeForExport to handle Custom step names properly
    const cleanedRecipe = this.cleanRecipeForExport(tab.recipe);
    await this.exportService.exportSingleRecipe(cleanedRecipe);
  }
  
  async exportAllRecipes(): Promise<void> {
    // Save all tabs first
    this.saveAllTabs();

    // Get all current recipes (for index.json)
    const allCurrentRecipes = this.mergeRecipeData(this.recipeList, this.storageService.getAllEditedRecipes());
    // Get only edited recipes (for file export)
    const editedRecipes = this.storageService.getAllEditedRecipes();

    if (allCurrentRecipes.length === 0) {
      this.notificationService.warning('No recipes to export');
      return;
    }

    // Validate all edited recipes before export
    const invalidRecipes: string[] = [];
    for (const recipe of editedRecipes) {
      const validationResult = this.validationService.validateRecipe(recipe);
      if (!validationResult.valid) {
        invalidRecipes.push(recipe.title || recipe.id);
      }
    }

    if (invalidRecipes.length > 0) {
      this.logger.warn('Some recipes have validation errors:', invalidRecipes);
      const proceed = confirm(`${invalidRecipes.length} recipe(s) have validation errors. Export anyway?\n\n${invalidRecipes.join('\n')}`);
      if (!proceed) {
        return;
      }
    }

    // Export as ZIP: edited recipes as files, all recipes in index.json
    await this.exportService.exportAllAsZip(editedRecipes, this.fileStorageService, allCurrentRecipes);
  }
  
  triggerImport(): void {
    this.fileInput.nativeElement.click();
  }
  
  async importRecipe(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const fileName = file.name.toLowerCase();
    
    // Check if it's a ZIP file or JSON file
    if (fileName.endsWith('.zip')) {
      // Handle ZIP import
      this.state.isImporting = true;
      this.state.importProgress = null;
      
      try {
        // Import recipes from ZIP with progress tracking
        const importedRecipes = await this.exportService.importFromZip(
          file,
          this.fileStorageService,
          (progress) => this.updateImportProgress(progress)
        );
        
        if (importedRecipes && importedRecipes.length > 0) {
          // Create tabs for all imported recipes
          let firstTabId: string | null = null;
          
          for (const recipe of importedRecipes) {
            const tab: RecipeTab = {
              id: this.generateUUID(),
              title: recipe.title,
              recipe: recipe,
              hasChanges: true,
              isActive: false
            };
            
            if (!firstTabId) {
              firstTabId = tab.id;
              tab.isActive = true;
            }
            
            this.state.tabs.push(tab);
            
            // Load images for each recipe
            await this.imageLoaderService.loadAllImagesForRecipe(recipe);
          }
          
          // Deactivate all existing tabs and activate the first imported one
          if (firstTabId) {
            this.state.tabs.forEach(t => {
              if (t.id !== firstTabId) {
                t.isActive = false;
              }
            });
            this.state.activeTabId = firstTabId;
            const activeTab = this.state.tabs.find(t => t.id === firstTabId);
            if (activeTab) {
              this.currentRecipe = activeTab.recipe;
              this.initializeExpandedSteps();
              this.triggerPreviewUpdate();
            }
          }
          
          this.notificationService.success(
            `Successfully imported ${importedRecipes.length} recipe${importedRecipes.length > 1 ? 's' : ''}`
          );
        }
      } catch (error) {
        this.logger.error('Error importing ZIP:', error);
        this.notificationService.error('Failed to import ZIP file');
      } finally {
        this.state.isImporting = false;
        this.state.importProgress = null;
      }
    } else if (fileName.endsWith('.json')) {
      // Handle single JSON import (existing logic)
      const imported = await this.exportService.importRecipe(file);
      
      if (imported) {
        // Create new tab with imported recipe
        const tab: RecipeTab = {
          id: this.generateUUID(),
          title: imported.title,
          recipe: imported,
          hasChanges: true,
          isActive: true
        };
        
        // Deactivate other tabs
        this.state.tabs.forEach(t => t.isActive = false);
        
        this.state.tabs.push(tab);
        this.state.activeTabId = tab.id;
        this.currentRecipe = imported;
        this.initializeExpandedSteps();
        this.triggerPreviewUpdate();
        
        // Load all images for imported recipe and check for missing images
        await this.imageLoaderService.loadAllImagesForRecipe(imported);
        const report = await this.imageLoaderService.checkMissingImagesAfterImport(imported);
        if (report.missingCount > 0) {
          this.logger.warn(`Missing ${report.missingCount} images after import`);
        }
        
        this.notificationService.success('Recipe imported successfully');
      } else {
        this.notificationService.error('Failed to import recipe');
      }
    } else {
      this.notificationService.error('Please select a .json or .zip file');
    }
    
    // Reset input
    input.value = '';
  }
  
  /**
   * Update import progress in state
   */
  private updateImportProgress(progress: ExportProgress): void {
    this.state.importProgress = progress;
    this.cdr.markForCheck();
  }
  
  clearAllData(): void {
    if (!confirm('This will clear all edited recipes and cannot be undone. Continue?')) {
      return;
    }
    
    this.storageService.clearAll();
    this.fileStorageService.clearAll();
    this.fileStorageService.clearAllJsonFiles();
    this.editedRecipeIds.clear();
    this.state.tabs = [];
    this.createNewTab();
    
    this.notificationService.success('All data cleared');
  }
  
  // Utility functions
  private getCurrentTab(): RecipeTab | undefined {
    return this.state.tabs.find(t => t.id === this.state.activeTabId);
  }
  
  hasUnsavedChanges(): boolean {
    return this.state.tabs.some(t => t.hasChanges);
  }
  
  /**
   * Get count of created recipes (new recipes not in original list)
   */
  getCreatedCount(): number {
    return this.getFilteredRecipes(true).length;
  }

  /**
   * Get count of modified existing recipes
   */
  getEditedExistingCount(): number {
    return this.getFilteredRecipes(false).length;
  }
  
  /**
   * Get list of created recipe titles for tooltip
   */
  getCreatedRecipeTitles(): RecipeTitleItem[] {
    const createdRecipes = this.getFilteredRecipes(true);
    return this.recipesToTitleItems(createdRecipes, EDITOR_CONSTANTS.TITLE_MAX_LENGTH_TOOLTIP);
  }

  /**
   * Get list of modified existing recipe titles for tooltip
   */
  getEditedExistingRecipeTitles(): RecipeTitleItem[] {
    const editedRecipes = this.getFilteredRecipes(false);
    return this.recipesToTitleItems(editedRecipes, EDITOR_CONSTANTS.TITLE_MAX_LENGTH_TOOLTIP);
  }

  /**
   * Get list of edited recipe titles for tooltip (legacy method, kept for compatibility)
   */
  getEditedRecipeTitles(): RecipeTitleItem[] {
    const allEditedRecipes = this.getFilteredRecipes();
    return this.recipesToTitleItems(allEditedRecipes, EDITOR_CONSTANTS.TITLE_MAX_LENGTH_EXPORT);
  }
  
  /**
   * Handle tooltip enter with delay cancellation
   */
  onTooltipEnter(type: string): void {
    // Cancel any pending hide timeout
    if (this.tooltipHideTimeout) {
      clearTimeout(this.tooltipHideTimeout);
      this.tooltipHideTimeout = null;
    }
    this.showTooltip = type;
  }
  
  /**
   * Handle tooltip leave with delay
   */
  onTooltipLeave(): void {
    // Set a delay before hiding the tooltip
    this.tooltipHideTimeout = setTimeout(() => {
      this.showTooltip = null;
      this.tooltipHideTimeout = null;
    }, EDITOR_CONSTANTS.TOOLTIP_HIDE_DELAY_MS);
  }
  
  /**
   * Handle click on recipe title in tooltip
   */
  onTooltipRecipeClick(recipeId: string): void {
    // Hide tooltip immediately
    this.showTooltip = null;
    
    // First check if the recipe is already open in a tab
    const existingTab = this.state.tabs.find(tab => tab.recipe.id === recipeId);
    if (existingTab) {
      // Switch to existing tab
      this.selectTab(existingTab.id);
      return;
    }
    
    // Load the recipe from storage
    const editedRecipes = this.storageService.getAllEditedRecipes();
    const recipe = editedRecipes.find(r => r.id === recipeId);
    
    if (recipe) {
      // Create new tab with the recipe
      const tab: RecipeTab = {
        id: this.generateUUID(),
        title: recipe.title,
        recipe: recipe,
        hasChanges: true,
        isActive: true
      };
      
      // Deactivate other tabs
      this.state.tabs.forEach(t => t.isActive = false);
      
      this.state.tabs.push(tab);
      this.state.activeTabId = tab.id;
      this.currentRecipe = recipe;
      this.initializeExpandedSteps();
      this.triggerPreviewUpdate();
      
      // Load images for the recipe
      this.imageLoaderService.loadAllImagesForRecipe(recipe);
      
    } else {
      this.notificationService.error('Recipe not found', 'Unable to locate the selected recipe');
    }
  }
  
  private updateJsonPreview(): void {
    if (!this.currentRecipe) {
      this.jsonPreview = '';
      return;
    }
    
    try {
      // Use clean recipe for preview (same as export)
      const cleanRecipe = this.cleanRecipeForExport(this.currentRecipe);
      this.jsonPreview = JSON.stringify(cleanRecipe, null, 2);
    } catch (error) {
      this.jsonPreview = 'Error generating JSON preview';
    }
  }
  
  // Clean recipe for export/preview (remove internal fields)
  private cleanRecipeForExport(recipe: SourceRecipeRecord): any {
    try {
      if (!recipe) return null;
      
      // Create a deep copy to avoid modifying original data
      // Use structuredClone if available, fallback to JSON method
      const cleanRecipe = typeof structuredClone !== 'undefined' 
        ? structuredClone(recipe)
        : JSON.parse(JSON.stringify(recipe));
      
      // Remove any internal fields that shouldn't be in export
      delete cleanRecipe.internalId;
      delete cleanRecipe.editorState;
      
      // Clean general images - remove displayUrl safely
      if (cleanRecipe.generalImages) {
        cleanRecipe.generalImages = cleanRecipe.generalImages.map((image: any) => {
          const { displayUrl, ...cleanImage } = image;
          return cleanImage;
        });
      }
      
      // Clean walkthrough step media - remove displayUrl safely and handle custom step names
      if (cleanRecipe.walkthrough) {
        cleanRecipe.walkthrough.forEach((step: any, index: number) => {
          if (step.media) {
            step.media = step.media.map((media: any) => {
              const { displayUrl, ...cleanMedia } = media;
              return cleanMedia;
            });
          }
          
          // If this is a custom step, replace step field with actual custom name
          if (step.step === 'Custom' && this.customStepNames[index]) {
            step.step = this.customStepNames[index];
          }
        });
      }
      
      return cleanRecipe;
    } catch (error) {
      this.logger.error('Error cleaning recipe for export:', error);
      return recipe; // Return original if cleaning fails
    }
  }

  // Handle image loading errors
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    this.logger.warn('Failed to load image:', img.src);
  }

  // Update image names when content changes (category, step names)
  private async updateImageNamesForContentChange(): Promise<void> {
    try {
      if (!this.currentRecipe?.walkthrough) return;

      let hasUpdates = false;

      for (let stepIndex = 0; stepIndex < this.currentRecipe.walkthrough.length; stepIndex++) {
        const step = this.currentRecipe.walkthrough[stepIndex];
        if (step.media) {
          const updated = await this.updateStepMediaNames(step.media, stepIndex);
          hasUpdates = hasUpdates || updated;
        }
      }

      if (hasUpdates) {
        this.cdr.detectChanges();
        this.notificationService.success('Image names updated based on recipe content');
      }
    } catch (error) {
      this.logger.error('Error updating image names:', error);
    }
  }

  private async updateStepMediaNames(media: RecipeStepMedia[], stepIndex: number): Promise<boolean> {
    let hasUpdates = false;

    for (const item of media) {
      if (!item.url || !item.url.startsWith('images/')) continue;

      const updated = await this.updateSingleMediaName(item, stepIndex);
      hasUpdates = hasUpdates || updated;
    }

    return hasUpdates;
  }

  private async updateSingleMediaName(media: RecipeStepMedia, stepIndex: number): Promise<boolean> {
    try {
      const currentFileName = media.url.replace('images/', '');
      const currentKey = currentFileName.replace(/\.[^/.]+$/, '');

      const imageFile = await this.fileStorageService.getImage(currentKey);
      if (!imageFile) return false;

      const newKey = this.imageNamingService.generateImageName(imageFile, this.currentRecipe!, stepIndex);
      if (currentKey === newKey) return false;

      const extension = currentFileName.split('.').pop() || 'jpg';
      const newFileName = `${newKey}.${extension}`;

      // Store with new key and delete old key
      await this.fileStorageService.storeImage(newKey, imageFile);
      await this.fileStorageService.deleteImage(currentKey);

      // Update media reference
      media.url = `images/${newFileName}`;

      // Clear any cached display URL
      if ((media as any).displayUrl) {
        URL.revokeObjectURL((media as any).displayUrl);
        delete (media as any).displayUrl;
      }

      this.logger.debug(`Updated image name: ${currentFileName} -> ${newFileName}`);
      return true;
    } catch (error) {
      this.logger.error('Error updating image name:', error);
      return false;
    }
  }
  
  private createEmptyRecipe(): SourceRecipeRecord {
    return {
      id: '',
      title: 'New Recipe',
      category: 'Batch',
      DSPVersions: [],
      overview: '',
      whenToUse: '',
      generalImages: [{
        type: 'image',
        url: '',
        alt: ''
      }],
      prerequisites: [{
        description: '',
        quickLinks: [{
          title: '',
          url: ''
        }]
      }],
      direction: '',
      connection: '',
      walkthrough: [{
        step: '',
        config: [{
          field: '',
          value: ''
        }],
        media: [{
          type: 'image',
          url: '',
          alt: ''
        }]
      }],
      downloadableExecutables: [],
      relatedRecipes: [{
        title: '',
        url: ''
      }],
      keywords: []
    };
  }
  
  private generateRecipeId(): string {
    return this.generateUUID();
  }

  /**
   * Check if a string is in UUID format
   */
  private isUUID(id: string): boolean {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
  
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  private convertToSourceRecord(recipe: RecipeItem): SourceRecipeRecord {
    return {
      id: recipe.id,
      title: recipe.title,
      category: recipe.category,
      DSPVersions: recipe.DSPVersions || [],
      overview: recipe.overview || recipe.usecase || '', // Support legacy field
      whenToUse: recipe.whenToUse || '',
      generalImages: recipe.generalImages || [],
      prerequisites: recipe.prerequisites || [],
      direction: recipe.direction || '',
      connection: recipe.connection || '',
      walkthrough: recipe.walkthrough as RecipeWalkthroughStep[] || [],
      downloadableExecutables: recipe.downloadableExecutables || [],
      relatedRecipes: recipe.relatedRecipes || [],
      keywords: recipe.keywords || []
    };
  }

  /**
   * Open preview in new tab
   */
  public openPreviewInNewTab(): void {
    if (!this.currentRecipe) return;

    // Use cleanRecipeForExport to handle Custom step names properly
    const cleanedRecipe = this.cleanRecipeForExport(this.currentRecipe);

    const previewData: RecipePreviewData = {
      recipeId: cleanedRecipe.id,
      title: cleanedRecipe.title,
      category: cleanedRecipe.category,
      recipeData: cleanedRecipe,
      timestamp: Date.now()
    };

    const result = this.previewService.openPreviewInNewTab(cleanedRecipe.id, previewData);
    
    if (!result.success) {
      // Show fallback dialog or notification
      this.notificationService.error('Unable to open preview. Please check your popup blocker settings.');
    }
  }


  /**
   * Update external preview if open
   */
  private updateExternalPreview(): void {
    if (!this.currentRecipe) return;

    // Use cleanRecipeForExport to handle Custom step names properly
    const cleanedRecipe = this.cleanRecipeForExport(this.currentRecipe);

    const previewData: RecipePreviewData = {
      recipeId: cleanedRecipe.id,
      title: cleanedRecipe.title,
      category: cleanedRecipe.category,
      recipeData: cleanedRecipe,
      timestamp: Date.now()
    };

    // Update preview (will notify open tabs via storage event)
    this.previewService.updatePreviewData(previewData);
  }
}