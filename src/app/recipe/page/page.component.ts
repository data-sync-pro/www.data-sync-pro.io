import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewEncapsulation,
  HostListener
} from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

import {
  RecipeItem,
  RecipeCategory,
  RecipeFilter,
  RecipeNavigationState,
  RecipeSection,
  RecipeTOCStructure,
  RecipeSearchState
} from '../core/models/recipe.model';
import { RecipeService } from '../core/services/recipe.service';
import { RecipeTocService } from './services/toc.service';
import { RecipeNavigationService } from './services/navigation.service';
import { RecipeUiStateService, RecipeUIState } from './services/ui-state.service';
import { RecipePreviewSyncService } from './services/preview-sync.service';
import { RecipeRouteHandlerService } from './services/route-handler.service';
import { RecipeSearchService } from './services/search.service';
import { RECIPE_CLASSES, RECIPE_MESSAGES} from '../core/constants/recipe.constants';
import { SelectedSuggestion } from './search-overlay/search-overlay.component';

/**
 * Recipes Component (Refactored)
 *
 * This component acts as a coordinator/orchestrator that delegates business logic to services.
 * It manages the template bindings and Change Detection, but does not contain business logic implementation.
 *
 * Service responsibilities:
 * - RecipeRouteHandlerService: Route handling, data loading coordination, navigation
 * - RecipeSearchService: Search state, search execution, overlay management
 * - RecipeService: Recipe data, caching, sorting
 * - RecipeUiStateService: UI state management
 * - RecipeNavigationService: Section navigation, scroll tracking
 * - RecipeTocService: TOC generation
 * - RecipePreviewSyncService: Preview mode synchronization
 */
@Component({
  selector: 'app-recipes',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipesComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  private needsObserverSetup: boolean = false;

  // UI State - managed by RecipeUiStateService
  ui!: RecipeUIState;

  // Search state - managed by RecipeSearchService
  search: RecipeSearchState = {
    query: '',
    isActive: false,
    results: [],
    hasResults: true,
    isOverlayOpen: false
  };

  // Search overlay initial query
  searchOverlayInitialQuery = '';

  // Navigation state
  navigation: RecipeNavigationState = {
    category: '',
    recipeName: ''
  };

  // Data
  recipes: RecipeItem[] = [];
  categories: RecipeCategory[] = [];
  currentRecipe: RecipeItem | null = null;
  filteredRecipes: RecipeItem[] = [];
  totalRecipeCount: number = 0;  // Total count of all recipes

  // Recipe TOC structure
  recipeTOC: RecipeTOCStructure = {
    tabs: []
  };

  // Filters
  currentFilter: RecipeFilter = {
    categories: [],
    searchQuery: '',
    showPopularOnly: false,
    tags: []
  };

  constructor(
    private route: ActivatedRoute,
    private recipeService: RecipeService,
    private cdr: ChangeDetectorRef,
    public recipeTocService: RecipeTocService,
    public recipeNavigationService: RecipeNavigationService,
    private uiStateService: RecipeUiStateService,
    private previewSyncService: RecipePreviewSyncService,
    private routeHandlerService: RecipeRouteHandlerService,
    private searchService: RecipeSearchService
  ) {}

  ngOnInit(): void {
    // Subscribe to UI state changes FIRST
    this.uiStateService.getState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.ui = state;
        this.cdr.markForCheck();
      });

    // Setup route handling - monitor route parameters and delegate to service
    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([params, queryParams]) => {
      // Extract route parameters for navigation state
      const category = params.get('category') || '';
      const recipeName = params.get('recipeName') || '';

      this.navigation = {
        category,
        recipeName
      };

      // Delegate route handling to service
      this.routeHandlerService.handleRouteParams(params, queryParams);

      this.cdr.markForCheck();
    });

    // Subscribe to data loaded events from route handler
    this.routeHandlerService.getDataLoadedEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.currentRecipe = result.currentRecipe;
        this.recipeTOC = result.recipeTOC;
        // Directly assign data without condition checks
        // This allows proper clearing/updating of data for all views
        this.recipes = result.recipes;
        this.filteredRecipes = result.filteredRecipes;
        this.needsObserverSetup = result.needsObserverSetup;
        this.totalRecipeCount = result.totalRecipeCount;  // Update total count
        this.cdr.markForCheck();
      });

    // Load initial data (categories and all recipes)
    this.loadInitialData();

    // Setup navigation service
    this.recipeNavigationService.setupOptimizedScrollListener();
    this.recipeNavigationService.setupSectionObserver();

    // Subscribe to navigation events
    this.recipeNavigationService.getNavigationEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.cdr.markForCheck();
      });

    // Subscribe to search state changes
    this.searchService.getSearchState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.search = state;
        this.cdr.markForCheck();
      });

    // Subscribe to search result events
    this.searchService.getSearchResultEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        const sortedResults = this.recipeService.sortRecipesByCategoryAndTitle(event.results);
        this.filteredRecipes = sortedResults;
        this.cdr.markForCheck();
      });

    // Subscribe to search overlay initial query
    this.searchService.getSearchOverlayInitialQuery()
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.searchOverlayInitialQuery = query;
        this.cdr.markForCheck();
      });

    // Subscribe to preview update events
    this.previewSyncService.getUpdateEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event.type === 'content-updated') {
          this.handlePreviewUpdate(event.recipe);
        }
      });

    // Add body class to hide footer on recipe pages
    document.body.classList.add(RECIPE_CLASSES.BODY_PAGE);
  }

  // ==================== Keyboard Shortcuts ====================

  /**
   * Keyboard shortcut: / to open search
   */
  @HostListener('document:keydown./', ['$event'])
  onSlashKey(event: KeyboardEvent) {
    if (!this.search.isOverlayOpen && !this.searchService.isInputFocused()) {
      event.preventDefault();
      this.openSearchOverlay();
    }
  }

  /**
   * Keyboard shortcut: Ctrl+K or Cmd+K to open search
   */
  @HostListener('document:keydown.control.k', ['$event'])
  @HostListener('document:keydown.meta.k', ['$event'])
  onCtrlK(event: KeyboardEvent) {
    event.preventDefault();
    if (!this.search.isOverlayOpen) {
      this.openSearchOverlay();
    }
  }

  /**
   * Keyboard shortcut: Escape to close search
   */
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.search.isOverlayOpen) {
      this.closeSearchOverlay();
    }
  }

  /**
   * Listen for hash changes (back/forward navigation)
   */
  @HostListener('window:hashchange', ['$event'])
  onHashChange(): void {
    this.recipeNavigationService.handleInitialHash();
  }

  // ==================== Lifecycle Methods ====================

  /**
   * After view initialization - setup observers
   */
  ngAfterViewInit(): void {
    if (this.needsObserverSetup && this.showRecipeDetails) {
      this.needsObserverSetup = false;
      requestAnimationFrame(() => {
        this.observeAllSections();
        this.recipeNavigationService.handleInitialHash();
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up navigation service
    this.recipeNavigationService.cleanup();

    // Clean up preview sync service
    this.previewSyncService.cleanup();

    // Remove body class
    document.body.classList.remove(RECIPE_CLASSES.BODY_PAGE);
  }

  // ==================== Initialization ====================

  /**
   * Load initial data (categories only)
   * Recipe data is loaded by RecipeRouteHandlerService based on route
   */
  private loadInitialData(): void {
    // Load categories - these are needed globally
    this.recipeService.getCategories().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (categories) => {
        this.categories = categories;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error(RECIPE_MESSAGES.ERROR_LOAD_CATEGORIES, error);
      }
    });

    // Recipe loading is handled by RecipeRouteHandlerService.handleRouteParams()
    // based on the current route (home/category/recipe detail)
  }

  /**
   * Handle preview update from preview sync service
   */
  private handlePreviewUpdate(recipe: RecipeItem): void {
    if (!this.currentRecipe) return;

    // Update current recipe
    this.currentRecipe = recipe;

    // Regenerate TOC structure
    this.recipeTocService.setCurrentRecipe(this.currentRecipe);
    this.recipeTOC = this.recipeTocService.generateRecipeTOCStructure();

    // Mark that observers need setup
    this.needsObserverSetup = true;

    // Trigger change detection
    this.cdr.markForCheck();
  }

  // ==================== Navigation Methods (Delegate to Service) ====================

  /**
   * Navigate to home page
   */
  goHome(): void {
    this.routeHandlerService.goHome();
  }

  /**
   * Navigate to category page
   */
  goToCategory(categoryName: string): void {
    this.routeHandlerService.goToCategory(categoryName, true);
  }

  /**
   * Navigate to recipe detail page
   */
  goToRecipe(recipe: RecipeItem): void {
    const currentId = this.currentRecipe?.id;
    const currentCategory = this.currentRecipe?.category;
    this.routeHandlerService.goToRecipe(recipe, currentId, currentCategory);
  }

  // ==================== Search Methods (Delegate to Service) ====================

  /**
   * Search recipes by query
   */
  searchRecipes(query: string): void {
    this.searchService.searchRecipes(query, this.currentFilter, this.recipes);
  }

  /**
   * Clear search and reset results
   */
  clearSearch(): void {
    this.searchService.clearSearch(this.recipes);
  }

  /**
   * Open search overlay
   */
  openSearchOverlay(initialQuery = ''): void {
    this.searchService.openSearchOverlay(initialQuery);
  }

  /**
   * Close search overlay
   */
  closeSearchOverlay(): void {
    this.searchService.closeSearchOverlay();
  }

  /**
   * Handle search overlay recipe selection
   */
  handleSearchOverlaySelect(selectedRecipe: SelectedSuggestion): void {
    this.searchService.handleSearchOverlaySelect(selectedRecipe);
  }

  // ==================== UI State Methods (Delegate to Service) ====================

  /**
   * Toggle sidebar collapsed/expanded
   */
  toggleSidebar(): void {
    this.uiStateService.toggleSidebar();
  }

  /**
   * Toggle mobile sidebar open/closed
   */
  toggleMobileSidebar(): void {
    this.uiStateService.toggleMobileSidebar();
  }

  /**
   * Close mobile sidebar
   */
  closeMobileSidebar(): void {
    this.uiStateService.closeMobileSidebar();
  }

  // ==================== Section Methods ====================

  /**
   * Get visible overview sections for rendering
   */
  getVisibleOverviewSections() {
    return this.recipeTocService.getVisibleOverviewSections();
  }

  /**
   * Get all sections (overview + walkthrough) for unified rendering
   */
  getAllSectionsForRendering(): any[] {
    return this.recipeTocService.getAllSectionsForRendering();
  }

  /**
   * Observe all sections for TOC highlighting
   */
  private observeAllSections(): void {
    const overviewElementIds = this.recipeTocService.getOverviewSectionsForTOC()
      .map((section: RecipeSection) => section.elementId || '')
      .filter((id: string) => id.length > 0);

    const walkthroughStepCount = this.walkthroughStepsData.length;

    this.recipeNavigationService.observeAllSections(overviewElementIds, walkthroughStepCount);
  }

  // ==================== Download ====================

  /**
   * Handle executable file download
   */
  downloadExecutable(url: string, title: string, originalFileName?: string): void {
    if (!url) {
      console.error('Download URL is empty');
      return;
    }

    const normalizedUrl = url.replace(/[\u2010-\u2015]/g, '_');

    const link = document.createElement('a');
    link.href = normalizedUrl;
    link.download = originalFileName || title || 'download';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Track download event
    if (this.currentRecipe) {
      this.recipeService.trackRecipeEvent({
        type: 'download',
        recipeId: this.currentRecipe.id,
        recipeTitle: this.currentRecipe.title,
        recipeCategory: this.currentRecipe.category,
        timestamp: new Date()
      });
    }
  }

  // ==================== Getters ====================

  /**
   * Get total recipe count (always returns all recipes count, not filtered)
   */
  getRecipeCount(): number {
    return this.totalRecipeCount;
  }

  /**
   * Get current breadcrumb path
   */
  get breadcrumbPath(): { name: string; url: string }[] {
    const path = [{ name: 'Recipes', url: '/recipes' }];

    if (this.navigation.category) {
      const category = this.categories.find(cat => cat.name === this.navigation.category);
      const categoryName = category?.displayName || this.navigation.category;
      path.push({
        name: categoryName,
        url: `/recipes/${this.navigation.category}`
      });
    }

    return path;
  }

  /**
   * Get recipes for current view (search results or filtered recipes)
   */
  get currentRecipes(): RecipeItem[] {
    return this.search.isActive ? this.search.results : this.filteredRecipes;
  }

  /**
   * Check if showing home view
   */
  get showHome(): boolean {
    return this.ui.currentView === 'home' && !this.search.isActive;
  }

  /**
   * Check if showing category view
   */
  get showCategory(): boolean {
    return this.ui.currentView === 'category' && !this.search.isActive;
  }

  /**
   * Check if showing recipe details
   */
  get showRecipeDetails(): boolean {
    return this.ui.currentView === 'recipe' && !!this.currentRecipe;
  }

  /**
   * Get current category info
   */
  get currentCategory(): RecipeCategory | null {
    return this.categories.find(cat => cat.name === this.navigation.category) || null;
  }

  /**
   * Get all walkthrough step names
   */
  get walkthroughSteps(): string[] {
    if (!this.currentRecipe?.walkthrough) return [];

    const walkthrough = this.currentRecipe.walkthrough;

    if (Array.isArray(walkthrough)) {
      return walkthrough.map((step, index) => step.step || `Step ${index + 1}`);
    }

    return [];
  }

  /**
   * Get walkthrough steps data for template iteration
   */
  get walkthroughStepsData(): any[] {
    if (!this.currentRecipe?.walkthrough || !Array.isArray(this.currentRecipe.walkthrough)) {
      return [];
    }
    return this.currentRecipe.walkthrough;
  }

  // ==================== TrackBy Functions ====================

  /**
   * TrackBy function for recipe lists
   */
  trackByRecipeId(_: number, recipe: RecipeItem): string {
    return recipe.id;
  }

  /**
   * TrackBy function for categories
   */
  trackByCategoryName(_: number, category: RecipeCategory): string {
    return category.name;
  }

  /**
   * TrackBy function for sections
   */
  trackBySectionId(index: number, section: any): string {
    return section.id || section.elementId || index.toString();
  }

  /**
   * TrackBy function for walkthrough steps
   */
  trackByStepIndex(index: number): number {
    return index;
  }

  /**
   * TrackBy function for breadcrumb path
   */
  trackByBreadcrumbUrl(_: number, crumb: {name: string; url: string}): string {
    return crumb.url;
  }

}
