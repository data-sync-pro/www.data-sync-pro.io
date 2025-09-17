import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef, NgZone, Renderer2 } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { RecipeStorageService } from '../shared/services/recipe-storage.service';
import { RecipeExportService } from '../shared/services/recipe-export.service';
import { RecipeFileStorageService } from '../shared/services/recipe-file-storage.service';
import { RecipeService } from '../shared/services/recipe.service';
import { NotificationService } from '../shared/services/notification.service';
import { RecipePreviewService, RecipePreviewData } from '../shared/services/recipe-preview.service';
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
} from '../shared/models/recipe.model';
import { ExportProgress } from '../shared/services/recipe-export.service';

interface RecipeTab {
  id: string;
  title: string;
  recipe: SourceRecipeRecord;
  hasChanges: boolean;
  isActive: boolean;
}

interface RecipeTitleItem {
  id: string;
  recipeId: string;
  title: string;
}

interface EditorState {
  tabs: RecipeTab[];
  activeTabId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  isImporting: boolean;
  importProgress: ExportProgress | null;
}

@Component({
  selector: 'app-recipe-editor',
  templateUrl: './recipe-editor.component.html',
  styleUrls: ['./recipe-editor.component.scss']
})
export class RecipeEditorComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;
  
  private destroy$ = new Subject<void>();
  private autoSaveSubject = new Subject<void>();
  private previewUpdateSubject = new Subject<void>();
  private imageNameUpdateTimeout: any;
  private autocompleteCloseTimeout: any;
  private autocompleteDebounceTimeout: any;
  
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
  categories = ['Batch', 'Triggers', 'Data List', 'Action Button', 'Data Loader'];
  
  // Current editing recipe
  currentRecipe: SourceRecipeRecord | null = null;
  currentIsActive = true; // Active state for current recipe
  jsonPreview = '';
  
  // Recipe active states from index.json
  private recipeActiveStates = new Map<string, boolean>();
  
  // Preview update timer
  private previewUpdateTimer: any;
  
  
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
    'Data List(Q) Settings',
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
  
  // Predefined fields for autocomplete by step type
  executableFields = [
    'Action',
    'Add reference field mappings for subsequent Executables?',
    'Batchable?',
    'Create non-reference field mappings?',
    'Create reference field mappings based on prior Executables?',
    'Description',
    'Executable API Name',
    'Executable Name',
    'Log to File?',
    'Source Matching Field',
    'Source Object API Name',
    'Target Matching Field',
    'Target Object API Name'
  ];

  triggerFields = [
    'After Delete Trigger?',
    'After Insert Trigger?',
    'After Undelete Trigger?',
    'After Update Trigger?',
    'All Internal Users Have Read Access?',
    'Applicable for Self-Adaptive Triggers?',
    'Applicable for Trigger Actions?',
    'Batchable?',
    'Before Delete Trigger?',
    'Before Insert Trigger?',
    'Before Update Trigger?',
    'Bypass Triggers Custom Permissions',
    'Do Not Track AGG Sources in Trigger?',
    'Pipeline',
    'Required Custom Permissions to Execute',
    'Run Once on Recursive Updates?',
    'Seq No.'
  ];

  scopingFields = [
    'Joiner',
    'Scope Filter',
    'Scope Filter (After Delete Trigger)',
    'Scope Filter (After Insert Trigger)',
    'Scope Filter (After Undelete Trigger)',
    'Scope Filter (After Update Trigger)',
    'Scope Filter (Before Delete Trigger)',
    'Scope Filter (Before Insert Trigger)',
    'Scope Filter (Before Update Trigger)',
    'Scope Filter (Post Join)'
  ];

  matchFields = [
    'Additional Target Matching Criteria',
    'Matched Records Sorting Components',
    'Principal Matched Record Selection Rule',
    'Target Matching Field',
    'Target Object API Name'
  ];

  actionFields = [
    'Action',
    'All or Nothing?',
    'Bypass Duplicate Rule Alerts?',
    'Skip Fields if Target Value Exists?',
    'Skip Null Value Fields?',
    'Skip Record Update if No Changes?',
    'Source Object Writeback Field',
    'Target Connection Name',
    'Target Object API Name',
    'Use Salesforce Upsert API?'
  ];

  retrieveVerifyPreviewFields = [
    'SOQL Query'
  ];

  batchSettingsFields = [
    'Action to Bulk API?',
    'Auto Retry Failed Batches?',
    'Batch Size',
    'Incremental Retrieval Field',
    'Incremental Retrieval Seed Time (Date)',
    'Incremental Retrieval Seed Time (Time)',
    'Incremental Retrieval Since',
    'Log to File?',
    'Notify Email Addresses',
    'Notify Owner?',
    'Notify When Execution Completes',
    'Required Custom Permissions to Execute',
    'Retrieve Limit',
    'Serial Mode?',
    'Stop Execution When a Batch Fails?',
    'Use Salesforce Upsert API?'
  ];

  actionButtonSettingsFields = [
    'Action Button Label',
    'Action Button Variant',
    'Action Confirm Message',
    'Action Icon Name',
    'Confirm Before Action?',
    'Edit Target Fields Before Action',
    'Q: List Action?',
    'Q: Row Action?',
    'Required Custom Permissions to Execute',
    'Success Message (UI)'
  ];

  dataListSettingsFields = [
    'Action Button Label',
    'Action Button Variant',
    'Action Confirm Message',
    'Action Icon Name',
    'Confirm Before Action?',
    'Edit Target Fields Before Action',
    'Q: Column Filter Default Opt. Field Name',
    'Q: Column Widths Mode',
    'Q: Context Record ID',
    'Q: Createable?',
    'Q: Data Load Executable API Name',
    'Q: Deletable?',
    'Q: Download as JSON?',
    'Q: Downloadable?',
    'Q: Editable Fields',
    'Q: Editable?',
    'Q: Filterable Columns',
    'Q: Help Text',
    'Q: Hide Others in Query Manager?',
    'Q: List Action?',
    'Q: Max Column Width',
    'Q: Max Row Selection',
    'Q: Min Column Width',
    'Q: New Record Executable API Name',
    'Q: Open Links in Current Tab?',
    'Q: Open Links in Record Page (Data List)?',
    'Q: Open Links in Record Page?',
    'Q: Override Columns',
    'Q: Page Size',
    'Q: Query Manager Toggleable?',
    'Q: Required Custom Permissions to View',
    'Q: Results Icon Name',
    'Q: Results Title',
    'Q: Retrieve All?',
    'Q: Row Action?',
    'Q: Row\'s Related Lists Pipeline API Name',
    'Q: See Labels While Building SOQL',
    'Q: Show Column Filter?',
    'Q: Show Picklist Labels?',
    'Q: Show Results in Tiles on Small Screen',
    'Q: Show Row Action \'Clone\'?',
    'Q: Show Row Action \'Delete\'?',
    'Q: Show Row Action \'Edit\'?',
    'Q: Show Row\'s Related Lists Below?',
    'Q: Small Screen Viewport Width',
    'Q: Sorted By',
    'Q: Sorted Direction',
    'Required Custom Permissions to Execute',
    'Success Message (UI)'
  ];

  dataLoaderSettingsFields = [
    'Action to Bulk API?',
    'Batch Size',
    'Error Out if Source Attributes Missing?',
    'Log to File?',
    'Pipeline',
    'Relax Field Mapping\'s Type Check?',
    'Required Custom Permissions to Execute',
    'Seq No.',
    'Serial Mode?',
    'Stop Execution When a Batch Fails?'
  ];

  inputFields = [
    'Import Data Profile',
    'Input Data Fields',
    'Input Data Key Field'
  ];
  
  constructor(
    private http: HttpClient,
    private recipeService: RecipeService,
    private storageService: RecipeStorageService,
    private exportService: RecipeExportService,
    private fileStorageService: RecipeFileStorageService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private renderer: Renderer2,
    private previewService: RecipePreviewService
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
    
    // Clean up timeouts
    if (this.autocompleteCloseTimeout) {
      clearTimeout(this.autocompleteCloseTimeout);
      this.autocompleteCloseTimeout = null;
    }
    
    if (this.autocompleteDebounceTimeout) {
      clearTimeout(this.autocompleteDebounceTimeout);
      this.autocompleteDebounceTimeout = null;
    }
    
    if (this.imageNameUpdateTimeout) {
      clearTimeout(this.imageNameUpdateTimeout);
      this.imageNameUpdateTimeout = null;
    }
    
    // Close all open autocompletes
    this.closeAllAutocomplete();
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
    
    // Close all open autocompletes
    this.closeAllAutocomplete();
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

  private closeAllAutocomplete(): void {
    const dropdowns = document.querySelectorAll('.autocomplete-dropdown');
    dropdowns.forEach(dropdown => {
      const wrapper = dropdown.parentElement;
      if (wrapper) {
        this.renderer.removeChild(wrapper, dropdown);
      }
    });
    
    // Clear references
    const inputs = document.querySelectorAll('.config-field') as NodeListOf<HTMLInputElement>;
    inputs.forEach(input => {
      if ((input as any).autocompleteDropdown) {
        (input as any).autocompleteDropdown = null;
      }
    });
    
    // Clear timeouts
    if (this.autocompleteCloseTimeout) {
      clearTimeout(this.autocompleteCloseTimeout);
      this.autocompleteCloseTimeout = null;
    }
    
    if (this.autocompleteDebounceTimeout) {
      clearTimeout(this.autocompleteDebounceTimeout);
      this.autocompleteDebounceTimeout = null;
    }
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
          console.error('Failed to load recipe active states:', error);
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
      debounceTime(3000),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.saveCurrentTab(true);
    });
  }
  
  private setupPreviewUpdate(): void {
    this.previewUpdateSubject.pipe(
      debounceTime(50), // 50ms debounce for responsive preview updates
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
    
    const previewData: RecipePreviewData = {
      recipeId: this.currentRecipe.id,
      title: this.currentRecipe.title,
      category: this.currentRecipe.category,
      recipeData: this.currentRecipe,
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
    
    // Deactivate other tabs
    this.state.tabs.forEach(t => t.isActive = false);
    
    this.state.tabs.push(tab);
    this.state.activeTabId = tab.id;
    this.currentRecipe = newRecipe;
    this.initializeExpandedSteps();
    this.triggerPreviewUpdate();
  }
  
  selectTab(tabId: string): void {
    const tab = this.state.tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    // Save current tab if has changes
    const currentTab = this.getCurrentTab();
    if (currentTab && currentTab.hasChanges) {
      this.saveTab(currentTab);
    }
    
    // Switch to selected tab
    this.state.tabs.forEach(t => t.isActive = false);
    tab.isActive = true;
    this.state.activeTabId = tabId;
    this.currentRecipe = tab.recipe;
    this.currentIsActive = this.isRecipeActive(tab.recipe.id);
    this.initializeExpandedSteps();
    this.triggerPreviewUpdate();
    
    // Load all images for this recipe tab
    this.loadAllImagesForRecipe(tab.recipe);
  }
  
  closeTab(tabId: string): void {
    const tabIndex = this.state.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    const tab = this.state.tabs[tabIndex];
    
    // Confirm if has unsaved changes
    if (tab.hasChanges) {
      if (!confirm('This tab has unsaved changes. Close anyway?')) {
        return;
      }
    }
    
    // Remove tab
    this.state.tabs.splice(tabIndex, 1);
    
    // If was active tab, activate another
    if (tab.isActive && this.state.tabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, this.state.tabs.length - 1);
      this.selectTab(this.state.tabs[newActiveIndex].id);
    }
    
    // Create new tab if no tabs left
    if (this.state.tabs.length === 0) {
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
          this.initializeExpandedSteps();
          this.triggerPreviewUpdate();
          this.state.isLoading = false;
          
          // Load all images for this recipe
          this.loadAllImagesForRecipe(sourceRecipe);
        },
        error: (error) => {
          console.error('Error loading recipe:', error);
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
  
  // Recipe editing
  onRecipeChange(): void {
    const tab = this.getCurrentTab();
    if (tab) {
      tab.hasChanges = true;
      tab.recipe = this.currentRecipe!;
      
      // Update tab title if recipe title changed
      if (this.currentRecipe?.title) {
        tab.title = this.currentRecipe.title;
      }
    }
    
    // Debounce image name updates when content changes
    if (this.imageNameUpdateTimeout) {
      clearTimeout(this.imageNameUpdateTimeout);
    }
    
    this.imageNameUpdateTimeout = setTimeout(() => {
      this.updateImageNamesForContentChange();
    }, 1000);
    
    this.triggerPreviewUpdate();
    this.autoSaveSubject.next();
    
    // Trigger cross-tab preview sync
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
    if (!this.currentRecipe?.walkthrough || index <= 0) return;
    
    const steps = this.currentRecipe.walkthrough;
    [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
    
    // Swap custom step names too
    if (this.customStepNames[index] !== undefined || this.customStepNames[index - 1] !== undefined) {
      const temp = this.customStepNames[index];
      this.customStepNames[index] = this.customStepNames[index - 1];
      this.customStepNames[index - 1] = temp;
      
      // Clean up undefined entries
      if (this.customStepNames[index] === undefined) {
        delete this.customStepNames[index];
      }
      if (this.customStepNames[index - 1] === undefined) {
        delete this.customStepNames[index - 1];
      }
    }
    
    this.onRecipeChange();
  }
  
  moveStepDown(index: number): void {
    if (!this.currentRecipe?.walkthrough || index >= this.currentRecipe.walkthrough.length - 1) return;
    
    const steps = this.currentRecipe.walkthrough;
    [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
    
    // Swap custom step names too
    if (this.customStepNames[index] !== undefined || this.customStepNames[index + 1] !== undefined) {
      const temp = this.customStepNames[index];
      this.customStepNames[index] = this.customStepNames[index + 1];
      this.customStepNames[index + 1] = temp;
      
      // Clean up undefined entries
      if (this.customStepNames[index] === undefined) {
        delete this.customStepNames[index];
      }
      if (this.customStepNames[index + 1] === undefined) {
        delete this.customStepNames[index + 1];
      }
    }
    
    this.onRecipeChange();
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
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.notificationService.error('Please select a valid image file');
      return;
    }
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.notificationService.error('Image file too large. Maximum size is 10MB');
      return;
    }
    
    try {
      // Generate meaningful image name based on recipe content
      const baseName = this.generateImageName(file, stepIndex);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fullFileName = `${baseName}.${extension}`;
      
      // Store image in IndexedDB using the base name as key
      await this.fileStorageService.storeImage(baseName, file);
      
      // Add to step media with immediate displayUrl generation
      const media: RecipeStepMedia = {
        type: 'image',
        url: `images/${fullFileName}`,
        alt: file.name.replace(/\.[^/.]+$/, '') // Remove extension from alt text
      };
      
      // Generate displayUrl immediately for instant preview
      try {
        console.log(`Attempting to generate displayUrl for baseName: ${baseName}`);
        const imageFile = await this.fileStorageService.getImage(baseName);
        if (imageFile) {
          const displayUrl = URL.createObjectURL(imageFile);
          (media as any).displayUrl = displayUrl;
          console.log(`Successfully generated displayUrl: ${displayUrl} for baseName: ${baseName}`);
        } else {
          console.warn(`No image file found for baseName: ${baseName}`);
        }
      } catch (error) {
        console.error('Failed to generate immediate displayUrl:', error);
      }
      
      this.currentRecipe.walkthrough[stepIndex].media.push(media);
      this.onRecipeChange();
      
      this.notificationService.success(`Image uploaded: ${fullFileName}`);
      
      // Trigger change detection to update UI
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error uploading image:', error);
      this.notificationService.error('Failed to upload image');
    }
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
  
  // Prerequisites management
  addPrerequisite(): void {
    if (!this.currentRecipe) return;
    
    const newPrereq: RecipePrerequisiteItem = {
      description: '',
      quickLinks: []
    };
    
    if (!this.currentRecipe.prerequisites) {
      this.currentRecipe.prerequisites = [];
    }
    
    this.currentRecipe.prerequisites.push(newPrereq);
    this.onRecipeChange();
  }
  
  removePrerequisite(index: number): void {
    if (!this.currentRecipe?.prerequisites) return;
    
    this.currentRecipe.prerequisites.splice(index, 1);
    this.onRecipeChange();
  }
  
  addQuickLink(prereqIndex: number): void {
    if (!this.currentRecipe?.prerequisites?.[prereqIndex]) return;
    
    const newLink: RecipeQuickLink = {
      title: '',
      url: ''
    };
    
    this.currentRecipe.prerequisites[prereqIndex].quickLinks.push(newLink);
    this.onRecipeChange();
  }
  
  removeQuickLink(prereqIndex: number, linkIndex: number): void {
    if (!this.currentRecipe?.prerequisites?.[prereqIndex]) return;
    
    this.currentRecipe.prerequisites[prereqIndex].quickLinks.splice(linkIndex, 1);
    this.onRecipeChange();
  }
  
  // DSP Versions management
  addDSPVersion(): void {
    if (!this.currentRecipe) return;
    
    if (!this.currentRecipe.DSPVersions) {
      this.currentRecipe.DSPVersions = [];
    }
    
    this.currentRecipe.DSPVersions.push('');
    this.onRecipeChange();
  }
  
  removeDSPVersion(index: number): void {
    if (!this.currentRecipe?.DSPVersions) return;
    
    this.currentRecipe.DSPVersions.splice(index, 1);
    this.onRecipeChange();
  }
  
  trackByIndex(index: number): number {
    return index;
  }
  
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.success('JSON copied to clipboard');
    }).catch(() => {
      this.notificationService.error('Failed to copy to clipboard');
    });
  }

  // Autocomplete functionality
  public handleFieldAutocomplete(event: Event, stepIndex: number): void {
    const input = event.target as HTMLInputElement;
    if (!input || !this.currentRecipe?.walkthrough?.[stepIndex]) return;

    // Clear existing debounce timeout
    if (this.autocompleteDebounceTimeout) {
      clearTimeout(this.autocompleteDebounceTimeout);
    }

    // Clear any pending close timeout when user is actively typing
    if (this.autocompleteCloseTimeout) {
      clearTimeout(this.autocompleteCloseTimeout);
      this.autocompleteCloseTimeout = null;
    }

    // Debounce the autocomplete to avoid frequent updates
    this.autocompleteDebounceTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        const stepName = this.currentRecipe?.walkthrough?.[stepIndex]?.step || '';
        const query = input.value.toLowerCase();
        const fieldsToUse = this.getFieldSuggestions(stepName);

        if (fieldsToUse.length === 0) {
          this.closeAutocompleteForInput(input);
          return;
        }

        // Filter fields based on query
        const matches = fieldsToUse.filter(field => 
          field.toLowerCase().includes(query) || query.length === 0
        );

        if (matches.length > 0) {
          this.showAutocomplete(input, matches);
        } else {
          this.closeAutocompleteForInput(input);
        }
      });
    }, 150); // 150ms debounce
  }

  private showAutocomplete(input: HTMLInputElement, matches: string[]): void {
    // Remove existing autocomplete
    this.closeAutocompleteForInput(input);

    const wrapper = input.closest('.autocomplete-wrapper');
    if (!wrapper) return;

    const dropdown = this.renderer.createElement('div');
    this.renderer.addClass(dropdown, 'autocomplete-dropdown');

    matches.forEach((match, index) => {
      const item = this.renderer.createElement('div');
      this.renderer.addClass(item, 'autocomplete-item');
      if (index === 0) this.renderer.addClass(item, 'selected');
      this.renderer.setProperty(item, 'textContent', match);
      
      // Use mousedown instead of click to fire before blur event
      this.renderer.listen(item, 'mousedown', (event) => {
        event.preventDefault(); // Prevent blur event
        this.ngZone.run(() => {
          // Update the model value properly through Angular
          const stepItem = wrapper.closest('.step-item');
          const configItem = wrapper.closest('.config-item');
          const configIndex = stepItem && configItem ? 
            Array.from(stepItem.querySelectorAll('.config-item')).indexOf(configItem) : -1;
          const stepIndex = parseInt(wrapper.closest('.step-item')?.getAttribute('data-step-index') || '0');
          
          if (this.currentRecipe?.walkthrough?.[stepIndex]?.config?.[configIndex]) {
            this.currentRecipe.walkthrough[stepIndex].config[configIndex].field = match;
            this.onRecipeChange();
            this.cdr.markForCheck(); // Trigger change detection
          }
          
          this.closeAutocompleteForInput(input);
        });
      });
      
      this.renderer.appendChild(dropdown, item);
    });

    this.renderer.appendChild(wrapper, dropdown);
    (input as any).autocompleteDropdown = dropdown;
  }

  public closeAutocomplete(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    // Add delay to allow user to click on autocomplete items
    this.autocompleteCloseTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        this.closeAutocompleteForInput(input);
      });
    }, 200); // 200ms delay
  }

  private closeAutocompleteForInput(input: HTMLInputElement): void {
    const wrapper = input.closest('.autocomplete-wrapper');
    if (wrapper) {
      const dropdown = wrapper.querySelector('.autocomplete-dropdown');
      if (dropdown) {
        this.renderer.removeChild(wrapper, dropdown);
      }
    }

    // Remove from input reference
    if ((input as any).autocompleteDropdown) {
      (input as any).autocompleteDropdown = null;
    }

    // Clear timeouts
    if (this.autocompleteCloseTimeout) {
      clearTimeout(this.autocompleteCloseTimeout);
      this.autocompleteCloseTimeout = null;
    }
  }

  public handleAutocompleteKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const dropdown = (input as any).autocompleteDropdown;

    if (!dropdown) return;

    this.ngZone.run(() => {
      const items = dropdown.querySelectorAll('.autocomplete-item');
      const selectedItem = dropdown.querySelector('.autocomplete-item.selected');
      let selectedIndex = Array.from(items).indexOf(selectedItem);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (selectedItem) this.renderer.removeClass(selectedItem, 'selected');
          selectedIndex = (selectedIndex + 1) % items.length;
          this.renderer.addClass(items[selectedIndex], 'selected');
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (selectedItem) this.renderer.removeClass(selectedItem, 'selected');
          selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
          this.renderer.addClass(items[selectedIndex], 'selected');
          break;

        case 'Enter':
          event.preventDefault();
          if (selectedItem) {
            const selectedValue = selectedItem.textContent || '';
            
            // Update the model value properly through Angular
            const wrapper = input.closest('.autocomplete-wrapper');
            const stepItem = wrapper?.closest('.step-item');
            const configItem = wrapper?.closest('.config-item');
            const configIndex = stepItem && configItem ? 
              Array.from(stepItem.querySelectorAll('.config-item')).indexOf(configItem) : -1;
            const stepIndex = parseInt(wrapper?.closest('.step-item')?.getAttribute('data-step-index') || '0');
            
            if (this.currentRecipe?.walkthrough?.[stepIndex]?.config?.[configIndex]) {
              this.currentRecipe.walkthrough[stepIndex].config[configIndex].field = selectedValue;
              this.onRecipeChange();
              this.cdr.markForCheck(); // Trigger change detection
            }
            
            this.closeAutocompleteForInput(input);
          }
          break;

        case 'Escape':
          this.closeAutocompleteForInput(input);
          break;
      }
    });
  }

  /**
   * Get field suggestions based on step type
   */
  getFieldSuggestions(stepType: string): string[] {
    switch (stepType) {
      case 'Create Executable':
      case 'Create Pipeline':
      case 'Create Scheduler':
        return this.executableFields;
      case 'Trigger Settings':
        return this.triggerFields;
      case 'Scoping':
        return this.scopingFields;
      case 'Match':
        return this.matchFields;
      case 'Action':
        return this.actionFields;
      case 'Retrieve':
      case 'Verify':
      case 'Preview':
      case 'Preview Transformed':
        return this.retrieveVerifyPreviewFields;
      case 'Batch Settings':
        return this.batchSettingsFields;
      case 'Action Button Settings':
        return this.actionButtonSettingsFields;
      case 'Data List(Q) Settings':
        return this.dataListSettingsFields;
      case 'Data Loader Settings':
        return this.dataLoaderSettingsFields;
      case 'Input':
        return this.inputFields;
      default:
        return this.executableFields; // Default fallback
    }
  }
  
  // Downloadable Executables management
  addDownloadableExecutable(): void {
    if (!this.currentRecipe) return;
    
    if (!this.currentRecipe.downloadableExecutables) {
      this.currentRecipe.downloadableExecutables = [];
    }
    
    const newExecutable: RecipeDownloadableExecutable = {
      filePath: ''
    };
    
    this.currentRecipe.downloadableExecutables.push(newExecutable);
    this.onRecipeChange();
  }
  
  removeDownloadableExecutable(index: number): void {
    if (!this.currentRecipe?.downloadableExecutables) return;
    
    const executable = this.currentRecipe.downloadableExecutables[index];
    
    // Delete from IndexedDB if it has a file
    if (executable.filePath) {
      const fileName = executable.filePath.replace('downloadExecutables/', '');
      this.fileStorageService.deleteJsonFile(fileName);
    }
    
    this.currentRecipe.downloadableExecutables.splice(index, 1);
    this.onRecipeChange();
  }
  
  async handleJsonFileUpload(file: File, index: number): Promise<void> {
    if (!this.currentRecipe?.downloadableExecutables?.[index]) return;
    
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
      this.currentRecipe.downloadableExecutables[index].filePath = `downloadExecutables/${fileName}`;
      this.onRecipeChange();
      
      this.notificationService.success(`JSON file uploaded: ${fileName}`);
    } catch (error) {
      console.error('Error uploading JSON file:', error);
      this.notificationService.error('Failed to upload JSON file');
    }
  }
  
  async onJsonFileDrop(event: DragEvent, index: number): Promise<void> {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    await this.handleJsonFileUpload(file, index);
  }
  
  onJsonFileDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const uploadArea = target.closest('.json-upload-area');
    if (uploadArea) {
      uploadArea.classList.add('drag-over');
    }
  }
  
  onJsonFileDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const uploadArea = target.closest('.json-upload-area');
    if (uploadArea) {
      uploadArea.classList.remove('drag-over');
    }
  }
  
  triggerJsonFileInput(index: number): void {
    const fileInput = document.querySelector(`#json-upload-${index}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
  
  async onJsonFileSelect(event: Event, index: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    await this.handleJsonFileUpload(file, index);
    
    // Reset input
    input.value = '';
  }
  
  getJsonFileName(executable: RecipeDownloadableExecutable): string {
    if (!executable.filePath) return '';
    return executable.filePath.replace('downloadExecutables/', '');
  }
  
  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
  
  // Keywords management
  addKeyword(): void {
    if (!this.currentRecipe) return;
    
    if (!this.currentRecipe.keywords) {
      this.currentRecipe.keywords = [];
    }
    
    this.currentRecipe.keywords.push('');
    this.onRecipeChange();
  }
  
  removeKeyword(index: number): void {
    if (!this.currentRecipe?.keywords) return;
    
    this.currentRecipe.keywords.splice(index, 1);
    this.onRecipeChange();
  }
  
  // Related Recipes management
  addRelatedRecipe(): void {
    if (!this.currentRecipe) return;
    
    if (!this.currentRecipe.relatedRecipes) {
      this.currentRecipe.relatedRecipes = [];
    }
    
    const newRelated: RecipeRelatedItem = {
      title: '',
      url: ''
    };
    
    this.currentRecipe.relatedRecipes.push(newRelated);
    this.onRecipeChange();
  }
  
  removeRelatedRecipe(index: number): void {
    if (!this.currentRecipe?.relatedRecipes) return;
    
    this.currentRecipe.relatedRecipes.splice(index, 1);
    this.onRecipeChange();
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
    
    const newCustomStepNames: { [index: number]: string } = {};
    
    // Re-map custom step names based on current step positions
    this.currentRecipe.walkthrough.forEach((step, index) => {
      if (step.step === 'Custom' && this.customStepNames[index]) {
        newCustomStepNames[index] = this.customStepNames[index];
      }
    });
    
    this.customStepNames = newCustomStepNames;
  }
  
  // Check for missing images after importing a recipe
  private async checkMissingImagesAfterImport(recipe: SourceRecipeRecord): Promise<void> {
    const missingImages: string[] = [];
    
    try {
      // Check walkthrough step media images
      if (recipe.walkthrough) {
        for (const step of recipe.walkthrough) {
          if (step.media) {
            for (const media of step.media) {
              if (media.type === 'image' && media.url && media.url.startsWith('images/')) {
                const fileName = media.url.replace('images/', '');
                const imageKey = fileName.replace(/\.[^/.]+$/, '');
                
                const exists = await this.fileStorageService.imageExists(imageKey);
                if (!exists) {
                  missingImages.push(media.url);
                }
              }
            }
          }
        }
      }
      
      // Check general images
      if (recipe.generalImages) {
        for (const image of recipe.generalImages) {
          if (image.url && image.url.startsWith('images/')) {
            const fileName = image.url.replace('images/', '');
            const imageKey = fileName.replace(/\.[^/.]+$/, '');
            
            const exists = await this.fileStorageService.imageExists(imageKey);
            if (!exists) {
              missingImages.push(image.url);
            }
          }
        }
      }
      
      // Report missing images
      if (missingImages.length > 0) {
        console.warn(`Missing ${missingImages.length} images after import:`, missingImages);
      } else {
        console.log('All images are available after import');
      }
    } catch (error) {
      console.error('Error checking missing images:', error);
    }
  }

  /**
   * Check if an image is missing from IndexedDB
   */
  public isImageMissing(media: any): boolean {
    if (!media || !media.url || !media.url.startsWith('images/')) {
      return false;
    }
    
    // If displayUrl exists, image is loaded successfully
    if (media.displayUrl) {
      return false;
    }
    
    // Consider it missing if no displayUrl and it's an uploaded image
    return true;
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
    
    const file = target.files[0];
    
    try {
      // Validate file
      const validation = this.fileStorageService.validateImageFile(file);
      if (!validation.valid) {
        this.notificationService.error(validation.error || 'Invalid file');
        return;
      }
      
      // Generate new image ID and store
      const imageId = this.fileStorageService.generateImageId();
      const originalName = this.fileStorageService.sanitizeFileName(file.name);
      const imageName = `${imageId}_${originalName}`;
      
      await this.fileStorageService.storeImage(imageId, file);
      
      // Update media object
      media.url = `images/${imageName}`;
      
      // Generate display URL immediately
      const displayUrl = URL.createObjectURL(file);
      (media as any).displayUrl = displayUrl;
      
      // Mark recipe as changed
      this.onRecipeChange();
      
      this.notificationService.success('Image replaced successfully');
      
      // Clear file input
      target.value = '';
      
    } catch (error) {
      console.error('Error replacing missing image:', error);
      this.notificationService.error('Failed to replace image');
    }
  }

  /**
   * Replace missing general image with new upload
   */
  public async replaceMissingGeneralImage(event: Event, image: any, imageIndex: number): Promise<void> {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    
    const file = target.files[0];
    
    try {
      // Validate file
      const validation = this.fileStorageService.validateImageFile(file);
      if (!validation.valid) {
        this.notificationService.error(validation.error || 'Invalid file');
        return;
      }
      
      // Generate new image ID and store
      const imageId = this.fileStorageService.generateImageId();
      const originalName = this.fileStorageService.sanitizeFileName(file.name);
      const imageName = `${imageId}_${originalName}`;
      
      await this.fileStorageService.storeImage(imageId, file);
      
      // Update image object
      image.url = `images/${imageName}`;
      
      // Generate display URL immediately
      const displayUrl = URL.createObjectURL(file);
      (image as any).displayUrl = displayUrl;
      
      // Mark recipe as changed
      this.onRecipeChange();
      
      this.notificationService.success('Image replaced successfully');
      
      // Clear file input
      target.value = '';
      
    } catch (error) {
      console.error('Error replacing missing general image:', error);
      this.notificationService.error('Failed to replace image');
    }
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
    
    // Validate file
    const validation = this.fileStorageService.validateImageFile(file);
    if (!validation.valid) {
      this.notificationService.error(validation.error!);
      return;
    }
    
    try {
      // Generate simple image name
      const baseName = this.generateGeneralImageName(file);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fullFileName = `${baseName}.${extension}`;
      
      // Store image in IndexedDB using the base name as key (like step media)
      await this.fileStorageService.storeImage(baseName, file);
      
      // Add to general images with immediate displayUrl generation
      const generalImage: RecipeGeneralImage = {
        type: 'image',
        url: `images/${fullFileName}`,
        alt: file.name.replace(/\.[^/.]+$/, ''), // Remove extension from alt text
        imageId: baseName // Use baseName as imageId for deletion compatibility
      };
      
      // Generate displayUrl immediately for instant preview
      try {
        console.log(`Attempting to generate displayUrl for general image baseName: ${baseName}`);
        const imageFile = await this.fileStorageService.getImage(baseName);
        if (imageFile) {
          const displayUrl = URL.createObjectURL(imageFile);
          (generalImage as any).displayUrl = displayUrl;
          console.log(`Successfully generated displayUrl for general image: ${displayUrl}`);
        } else {
          console.warn(`No image file found for general image baseName: ${baseName}`);
        }
      } catch (error) {
        console.error('Failed to generate immediate displayUrl for general image:', error);
      }
      
      if (!this.currentRecipe.generalImages) {
        this.currentRecipe.generalImages = [];
      }
      
      this.currentRecipe.generalImages.push(generalImage);
      this.onRecipeChange();
      
      this.notificationService.success(`General image added: ${fullFileName}`);
      
      // Trigger change detection to update UI
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error uploading general image:', error);
      this.notificationService.error('Failed to upload general image');
    }
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
    
    // Generate ID if needed
    if (!tab.recipe.id) {
      tab.recipe.id = this.generateRecipeId(tab.recipe.title);
    }
    
    // Save to storage
    this.storageService.saveRecipe(tab.recipe);
    this.editedRecipeIds.add(tab.recipe.id);
    
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
    
    await this.exportService.exportSingleRecipe(tab.recipe);
  }
  
  async exportAllRecipes(): Promise<void> {
    // Save all tabs first
    this.saveAllTabs();
    
    // Get all edited recipes
    const recipes = this.storageService.getAllEditedRecipes();
    
    if (recipes.length === 0) {
      this.notificationService.warning('No edited recipes to export');
      return;
    }
    
    // Export as ZIP with images
    await this.exportService.exportAllAsZip(recipes, this.fileStorageService);
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
            await this.loadAllImagesForRecipe(recipe);
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
        console.error('Error importing ZIP:', error);
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
        await this.loadAllImagesForRecipe(imported);
        this.checkMissingImagesAfterImport(imported);
        
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
    const editedRecipes = this.storageService.getAllEditedRecipes();
    const originalRecipeIds = new Set(this.recipeList.map(r => r.id));
    
    let createdCount = 0;
    editedRecipes.forEach(recipe => {
      if (recipe.id && !originalRecipeIds.has(recipe.id)) {
        createdCount++;
      }
    });
    
    return createdCount;
  }
  
  /**
   * Get count of modified existing recipes
   */
  getEditedExistingCount(): number {
    const editedRecipes = this.storageService.getAllEditedRecipes();
    const originalRecipeIds = new Set(this.recipeList.map(r => r.id));
    
    let editedCount = 0;
    editedRecipes.forEach(recipe => {
      if (recipe.id && originalRecipeIds.has(recipe.id)) {
        editedCount++;
      }
    });
    
    return editedCount;
  }
  
  /**
   * Get list of created recipe titles for tooltip
   */
  getCreatedRecipeTitles(): RecipeTitleItem[] {
    const editedRecipes = this.storageService.getAllEditedRecipes();
    const originalRecipeIds = new Set(this.recipeList.map(r => r.id));
    const items: RecipeTitleItem[] = [];
    
    editedRecipes.forEach(recipe => {
      if (recipe.id && recipe.title && !originalRecipeIds.has(recipe.id)) {
        // Truncate long titles to prevent tooltip overflow
        const truncatedTitle = recipe.title.length > 50 
          ? recipe.title.substring(0, 50) + '...' 
          : recipe.title;
          
        items.push({
          id: recipe.id,
          recipeId: recipe.id,
          title: truncatedTitle
        });
      }
    });
    
    // Sort alphabetically and limit to 10 items
    return items.sort((a, b) => a.title.localeCompare(b.title)).slice(0, 10);
  }
  
  /**
   * Get list of modified existing recipe titles for tooltip
   */
  getEditedExistingRecipeTitles(): RecipeTitleItem[] {
    const editedRecipes = this.storageService.getAllEditedRecipes();
    const originalRecipeIds = new Set(this.recipeList.map(r => r.id));
    const items: RecipeTitleItem[] = [];
    
    editedRecipes.forEach(recipe => {
      if (recipe.id && recipe.title && originalRecipeIds.has(recipe.id)) {
        // Truncate long titles to prevent tooltip overflow
        const truncatedTitle = recipe.title.length > 50 
          ? recipe.title.substring(0, 50) + '...' 
          : recipe.title;
          
        items.push({
          id: recipe.id,
          recipeId: recipe.id,
          title: truncatedTitle
        });
      }
    });
    
    // Sort alphabetically and limit to 10 items
    return items.sort((a, b) => a.title.localeCompare(b.title)).slice(0, 10);
  }
  
  /**
   * Get list of edited recipe titles for tooltip (legacy method, kept for compatibility)
   */
  getEditedRecipeTitles(): RecipeTitleItem[] {
    const editedRecipes = this.storageService.getAllEditedRecipes();
    const items: RecipeTitleItem[] = [];
    
    editedRecipes.forEach(recipe => {
      if (recipe.id && recipe.title) {
        // Truncate long titles to prevent tooltip overflow
        const truncatedTitle = recipe.title.length > 60 
          ? recipe.title.substring(0, 60) + '...' 
          : recipe.title;
          
        items.push({
          id: recipe.id,
          recipeId: recipe.id,
          title: truncatedTitle
        });
      }
    });
    
    // Sort alphabetically and limit to 10 items
    return items.sort((a, b) => a.title.localeCompare(b.title)).slice(0, 10);
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
    }, 300); // 300ms delay
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
      this.loadAllImagesForRecipe(recipe);
      
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
      console.error('Error cleaning recipe for export:', error);
      return recipe; // Return original if cleaning fails
    }
  }
  
  // Generate meaningful image name based on recipe content
  private generateImageName(file: File, stepIndex: number): string {
    try {
      if (!this.currentRecipe) return this.fallbackImageName();
      
      const category = this.createSafeString(this.currentRecipe.category || 'uncategorized');
      
      // Get current step name
      const step = this.currentRecipe.walkthrough?.[stepIndex];
      const stepName = this.createSafeString(step?.step || 'step');
      
      // Get file extension
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Create base name
      const baseName = `${category}-${stepName}-image`;
      
      // Ensure unique name within current recipe
      return this.ensureUniqueImageName(baseName, extension);
    } catch (error) {
      console.error('Error generating image name:', error);
      return this.fallbackImageName();
    }
  }
  
  // Create safe filename string
  private createSafeString(text: string): string {
    if (!text || typeof text !== 'string') return 'unnamed';
    
    return text
      .toLowerCase()
      .trim()
      .replace(/[/\\?<>\\:*|"]/g, '') // Remove invalid filename characters
      .replace(/[^\w\s-]/g, '') // Keep only word characters, spaces, and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 30) // Limit length
      || 'unnamed';
  }
  
  // Ensure unique image name within current recipe
  private ensureUniqueImageName(baseName: string, extension: string): string {
    if (!this.currentRecipe) return `${baseName}.${extension}`;
    
    const usedNames = new Set<string>();
    
    // Collect all existing image names in current recipe
    if (this.currentRecipe.walkthrough) {
      this.currentRecipe.walkthrough.forEach(step => {
        if (step.media) {
          step.media.forEach(media => {
            if (media.url && media.url.startsWith('images/')) {
              const fileName = media.url.replace('images/', '');
              const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
              usedNames.add(nameWithoutExt);
            }
          });
        }
      });
    }
    
    // Check if base name is unique
    let finalName = baseName;
    let counter = 1;
    
    while (usedNames.has(finalName)) {
      finalName = `${baseName}-${++counter}`;
    }
    
    return finalName;
  }
  
  // Fallback image name when generation fails
  private fallbackImageName(): string {
    return `image-${Date.now()}`;
  }
  
  // Generate simple name for general images
  private generateGeneralImageName(file: File): string {
    try {
      if (!this.currentRecipe) return 'general-image';
      
      // Get current general images count for indexing
      const existingCount = this.currentRecipe.generalImages?.length || 0;
      
      // Create simple base name
      const baseName = existingCount === 0 ? 'general-image' : `general-image-${existingCount + 1}`;
      
      // Ensure unique name within current recipe
      return this.ensureUniqueGeneralImageName(baseName, '');
    } catch (error) {
      console.error('Error generating general image name:', error);
      return 'general-image';
    }
  }
  
  // Ensure unique general image name within current recipe
  private ensureUniqueGeneralImageName(baseName: string, extension: string): string {
    if (!this.currentRecipe) return baseName;
    
    const usedNames = new Set<string>();
    
    // Collect all existing general image names in current recipe
    if (this.currentRecipe.generalImages) {
      this.currentRecipe.generalImages.forEach(image => {
        if (image.url && image.url.startsWith('images/')) {
          const fileName = image.url.replace('images/', '');
          const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
          usedNames.add(nameWithoutExt);
        }
      });
    }
    
    // Check if base name is unique
    let finalName = baseName;
    let counter = 2;
    
    while (usedNames.has(finalName)) {
      if (baseName === 'general-image') {
        finalName = `general-image-${counter}`;
      } else {
        // Extract number from baseName and increment
        const match = baseName.match(/general-image-(\d+)/);
        if (match) {
          const currentNum = parseInt(match[1]);
          finalName = `general-image-${currentNum + counter - 1}`;
        } else {
          finalName = `${baseName}-${counter}`;
        }
      }
      counter++;
    }
    
    return finalName;
  }
  
  // Load image for media item asynchronously
  async loadImageForMedia(media: any): Promise<void> {
    try {
      if (!media.url) return;

      // Check if it's an assets path (static image)
      if (media.url.startsWith('assets/') || this.isAssetsImagePath(media.url)) {
        const assetsUrl = this.normalizeAssetsImageUrl(media.url);
        console.log(`Loading assets image: ${assetsUrl}`);
        
        // For assets images, use the URL directly
        media.displayUrl = assetsUrl;
        console.log(`Successfully loaded assets media image: ${assetsUrl}`);
        this.cdr.detectChanges();
        return;
      }

      // Handle IndexedDB images (uploaded images)
      if (media.url.startsWith('images/')) {
        const fileName = media.url.replace('images/', '');
        const imageKey = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
        
        console.log(`Loading image for media with key: ${imageKey}`);
        
        const imageFile = await this.fileStorageService.getImage(imageKey);
        
        if (imageFile) {
          const displayUrl = URL.createObjectURL(imageFile);
          media.displayUrl = displayUrl;
          console.log(`Successfully loaded media image: ${displayUrl}`);
          this.cdr.detectChanges(); // Trigger change detection
        } else {
          console.warn(`No image file found for media key: ${imageKey}`);
        }
      }
    } catch (error) {
      console.error('Error loading image for media:', error);
    }
  }
  
  // Load image for general image item asynchronously
  async loadImageForGeneralImage(image: any): Promise<void> {
    try {
      if (!image.url) return;

      // Check if it's an assets path (static image)
      if (image.url.startsWith('assets/') || this.isAssetsImagePath(image.url)) {
        const assetsUrl = this.normalizeAssetsImageUrl(image.url);
        console.log(`Loading assets general image: ${assetsUrl}`);
        
        // For assets images, use the URL directly
        image.displayUrl = assetsUrl;
        console.log(`Successfully loaded assets general image: ${assetsUrl}`);
        this.cdr.detectChanges();
        return;
      }

      // Handle IndexedDB images (uploaded images)
      if (image.url.startsWith('images/')) {
        const fileName = image.url.replace('images/', '');
        const imageKey = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
        
        console.log(`Loading general image with key: ${imageKey}`);
        
        const imageFile = await this.fileStorageService.getImage(imageKey);
        
        if (imageFile) {
          const displayUrl = URL.createObjectURL(imageFile);
          image.displayUrl = displayUrl;
          console.log(`Successfully loaded general image: ${displayUrl}`);
          this.cdr.detectChanges(); // Trigger change detection
        } else {
          console.warn(`No image file found for general image key: ${imageKey}`);
        }
      }
    } catch (error) {
      console.error('Error loading image for general image:', error);
    }
  }
  
  // Handle image loading errors
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    console.warn('Failed to load image:', img.src);
  }

  /**
   * Check if image URL is an assets path (relative path from recipe JSON)
   */
  private isAssetsImagePath(url: string): boolean {
    // Check if it's a relative image path that should be converted to assets path
    return url.startsWith('images/') && !url.includes('blob:') && !!this.currentRecipe?.id;
  }

  /**
   * Convert relative image path to full assets URL
   */
  private normalizeAssetsImageUrl(url: string): string {
    if (url.startsWith('assets/')) {
      return url; // Already a full assets path
    }
    
    // Convert relative images/ path to full assets path using current recipe ID
    if (url.startsWith('images/') && this.currentRecipe?.id) {
      return `assets/recipes/${this.currentRecipe.id}/${url}`;
    }
    
    return url;
  }

  /**
   * Load all images for the current recipe
   */
  async loadAllImagesForRecipe(recipe?: SourceRecipeRecord): Promise<void> {
    const targetRecipe = recipe || this.currentRecipe;
    if (!targetRecipe) return;

    console.log('Loading all images for recipe:', targetRecipe.title);

    try {
      // Load walkthrough step media images
      if (targetRecipe.walkthrough && targetRecipe.walkthrough.length > 0) {
        for (const step of targetRecipe.walkthrough) {
          if (step.media && step.media.length > 0) {
            for (const media of step.media) {
              if (media.type === 'image' && media.url && (media.url.startsWith('images/') || media.url.startsWith('assets/'))) {
                await this.loadImageForMedia(media);
              }
            }
          }
        }
      }

      // Load general images
      if (targetRecipe.generalImages && targetRecipe.generalImages.length > 0) {
        for (const image of targetRecipe.generalImages) {
          if (image.url && (image.url.startsWith('images/') || image.url.startsWith('assets/'))) {
            await this.loadImageForGeneralImage(image);
          }
        }
      }

      console.log('All images loaded for recipe:', targetRecipe.title);
      
      // Trigger change detection to update UI
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading all images for recipe:', error);
    }
  }
  
  // Update image names when content changes (category, step names)
  private async updateImageNamesForContentChange(): Promise<void> {
    try {
      if (!this.currentRecipe?.walkthrough) return;
      
      let hasUpdates = false;
      
      for (let stepIndex = 0; stepIndex < this.currentRecipe.walkthrough.length; stepIndex++) {
        const step = this.currentRecipe.walkthrough[stepIndex];
        if (!step.media) continue;
        
        for (const media of step.media) {
          if (media.url && media.url.startsWith('images/')) {
            // Extract current filename and key
            const currentFileName = media.url.replace('images/', '');
            const currentKey = currentFileName.replace(/\.[^/.]+$/, '');
            
            // Get the stored image file
            const imageFile = await this.fileStorageService.getImage(currentKey);
            if (!imageFile) continue;
            
            // Generate new name based on current content
            const newKey = this.generateImageName(imageFile, stepIndex);
            const extension = currentFileName.split('.').pop() || 'jpg';
            const newFileName = `${newKey}.${extension}`;
            
            if (currentKey !== newKey) {
              try {
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
                
                hasUpdates = true;
                
                console.log(`Updated image name: ${currentFileName} -> ${newFileName}`);
              } catch (error) {
                console.error('Error updating image name:', error);
              }
            }
          }
        }
      }
      
      if (hasUpdates) {
        this.cdr.detectChanges(); // Trigger change detection to update UI
        this.notificationService.success('Image names updated based on recipe content');
      }
    } catch (error) {
      console.error('Error updating image names:', error);
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
  
  private generateRecipeId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
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

    const previewData: RecipePreviewData = {
      recipeId: this.currentRecipe.id,
      title: this.currentRecipe.title,
      category: this.currentRecipe.category,
      recipeData: this.currentRecipe,
      timestamp: Date.now()
    };

    const result = this.previewService.openPreviewInNewTab(this.currentRecipe.id, previewData);
    
    if (!result.success) {
      // Show fallback dialog or notification
      this.notificationService.error('Unable to open preview. Please check your popup blocker settings.');
    }
  }

  /**
   * Update preview content
   */
  private updatePreview(): void {
    if (!this.currentRecipe) {
      return;
    }

    // Debounced preview update
    if (this.previewUpdateTimer) {
      clearTimeout(this.previewUpdateTimer);
    }

    this.previewUpdateTimer = setTimeout(() => {
      // Also update external preview if open
      this.updateExternalPreview();
    }, 500);
  }


  /**
   * Update external preview if open
   */
  private updateExternalPreview(): void {
    if (!this.currentRecipe) return;

    const previewData: RecipePreviewData = {
      recipeId: this.currentRecipe.id,
      title: this.currentRecipe.title,
      category: this.currentRecipe.category,
      recipeData: this.currentRecipe,
      timestamp: Date.now()
    };

    // Update preview (will notify open tabs via storage event)
    this.previewService.updatePreviewData(previewData);
  }
}