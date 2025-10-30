import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewEncapsulation,
  HostListener
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  RecipeItem,
  RecipeCategory,
  RecipeFilter,
  RecipeNavigationState,
  RecipeSection,
  RecipeTab,
  RecipeTOCStructure,
  RecipeSearchResult
} from '../shared/models/recipe.model';
import { RecipeService } from '../shared/services/recipe.service';
import { RecipePreviewService } from '../shared/services/recipe-preview.service';
import { RecipeTocService } from '../shared/services/recipe-toc.service';
import { RecipeNavigationService } from '../shared/services/recipe-navigation.service';
import { RecipeUiStateService, RecipeUIState } from '../shared/services/recipe-ui-state.service';
import { RecipePreviewSyncService } from '../shared/services/recipe-preview-sync.service';
import { SelectedSuggestion } from './recipe-search-overlay/recipe-search-overlay.component';

interface SearchState {
  query: string;
  isActive: boolean;
  results: RecipeSearchResult[];
  hasResults: boolean;
  isOverlayOpen: boolean;
}

@Component({
  selector: 'app-recipes',
  templateUrl: './recipes.component.html',
  styleUrls: ['./recipes.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // UI State - managed by RecipeUiStateService
  ui!: RecipeUIState;

  search: SearchState = {
    query: '',
    isActive: false,
    results: [],
    hasResults: true,
    isOverlayOpen: false
  };

  // Search overlay state
  searchOverlayInitialQuery = '';

  navigation: RecipeNavigationState = {
    category: '',
    recipeName: ''
  };

  // Data
  recipes: RecipeItem[] = [];
  categories: RecipeCategory[] = [];
  currentRecipe: RecipeItem | null = null;
  filteredRecipes: RecipeItem[] = [];
  
  // Recipe TOC structure
  recipeTOC: RecipeTOCStructure = {
    tabs: [],
    currentSectionId: 'use-case'
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
    private router: Router,
    private recipeService: RecipeService,
    private previewService: RecipePreviewService,
    private cdr: ChangeDetectorRef,
    private recipeTocService: RecipeTocService,
    private recipeNavigationService: RecipeNavigationService,
    private uiStateService: RecipeUiStateService,
    private previewSyncService: RecipePreviewSyncService
  ) {}

  ngOnInit(): void {
    // Subscribe to UI state changes FIRST - must happen before any code that accesses this.ui
    this.uiStateService.getState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.ui = state;
        this.cdr.markForCheck();
      });

    // Now safe to initialize and access UI state
    this.initializeComponent();
    this.setupRouteHandling();
    this.loadInitialData();

    // Setup navigation service
    this.recipeNavigationService.setupOptimizedScrollListener();
    this.recipeNavigationService.setupSectionObserver();

    // Subscribe to navigation events
    this.recipeNavigationService.getNavigationEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event.type === 'section-changed' && event.sectionId) {
          this.uiStateService.setActiveSectionId(event.sectionId);
          this.recipeTOC.currentSectionId = event.sectionId;
        } else if (event.type === 'user-scrolled') {
          this.uiStateService.markUserScrolled();
        }
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
    document.body.classList.add('recipe-page');
  }

  /**
   * Keyboard shortcuts for search overlay
   */
  @HostListener('document:keydown./', ['$event'])
  onSlashKey(event: KeyboardEvent) {
    if (!this.search.isOverlayOpen && !this.isInputFocused()) {
      event.preventDefault();
      this.openSearchOverlay();
    }
  }

  @HostListener('document:keydown.control.k', ['$event'])
  @HostListener('document:keydown.meta.k', ['$event'])
  onCtrlK(event: KeyboardEvent) {
    event.preventDefault();
    if (!this.search.isOverlayOpen) {
      this.openSearchOverlay();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.search.isOverlayOpen) {
      this.closeSearchOverlay();
    }
  }





  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    return !!(activeElement instanceof HTMLInputElement || 
           activeElement instanceof HTMLTextAreaElement ||
           (activeElement && activeElement.tagName === 'INPUT') ||
           (activeElement && activeElement.tagName === 'TEXTAREA'));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up navigation service
    this.recipeNavigationService.cleanup();

    // Clean up preview sync service
    this.previewSyncService.cleanup();

    // Remove body class when leaving recipe pages
    document.body.classList.remove('recipe-page');
  }

  /**
   * Initialize component
   */
  private initializeComponent(): void {
    this.uiStateService.setLoading(true);
  }

  /**
   * Sort recipes by category first, then by title A-Z
   */
  private sortRecipesByCategoryAndTitle(recipes: RecipeItem[]): RecipeItem[] {
    return [...recipes].sort((a, b) => {
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) {
        return categoryCompare;
      }
      return a.title.localeCompare(b.title);
    });
  }

  /**
   * Setup route parameter handling
   */
  private setupRouteHandling(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const category = params.get('category') || '';
      const recipeName = params.get('recipeName') || '';
      
      this.navigation = { category, recipeName };
      
      // Check for preview mode
      this.route.queryParamMap.pipe(
        takeUntil(this.destroy$)
      ).subscribe(queryParams => {
        const isPreview = queryParams.get('preview') === 'true';
        const previewRecipeId = queryParams.get('recipeId');
        
        if (isPreview && previewRecipeId) {
          this.uiStateService.setPreviewMode(true);
          this.uiStateService.setCurrentView('recipe');
          this.loadPreviewRecipe(previewRecipeId);
          this.setupPreviewSync(previewRecipeId);
        } else {
          this.uiStateService.setPreviewMode(false);
          // Determine current view for normal mode
          if (recipeName) {
            this.uiStateService.setCurrentView('recipe');
            this.loadRecipeDetails(category, recipeName);
          } else if (category) {
            this.uiStateService.setCurrentView('category');
            this.loadCategoryRecipes(category);
          } else {
            this.uiStateService.setCurrentView('home');
            this.loadAllRecipes();
          }
        }
      });
      
      this.cdr.markForCheck();
    });
  }



  /**
   * Load initial data
   */
  private loadInitialData(): void {
    this.uiStateService.setLoading(true);

    // Load categories
    this.recipeService.getCategories().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (categories) => {
        this.categories = categories;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
      }
    });

    // Load all recipes
    this.recipeService.getRecipes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recipes) => {
        this.recipes = recipes;
        // Only set filteredRecipes when in home view to avoid overwriting category filters
        if (this.uiStateService.getCurrentView() === 'home') {
          this.filteredRecipes = this.sortRecipesByCategoryAndTitle(recipes);
        }
        this.uiStateService.setLoading(false);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load recipes:', error);
        this.uiStateService.setLoading(false);
      }
    });
  }

  /**
   * Load all recipes for home view
   */
  private loadAllRecipes(): void {
    this.recipeService.getRecipes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recipes) => {
        this.recipes = recipes;
        this.filteredRecipes = this.sortRecipesByCategoryAndTitle(recipes);
        this.uiStateService.setLoading(false);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load recipes:', error);
        this.uiStateService.setLoading(false);
      }
    });
  }

  /**
   * Load recipes for specific category
   */
  private loadCategoryRecipes(category: string): void {
    this.recipeService.getRecipesByCategory(category).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recipes) => {
        this.recipes = recipes;
        this.filteredRecipes = this.sortRecipesByCategoryAndTitle(recipes);
        this.uiStateService.setLoading(false);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load category recipes:', error);
        this.uiStateService.setLoading(false);
      }
    });
  }

  /**
   * Load specific recipe details by slug
   */
  private loadRecipeDetails(category: string, recipeSlug: string): void {
    this.recipeService.getRecipe(category, recipeSlug).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recipe) => {
        this.currentRecipe = recipe;
        this.uiStateService.setLoading(false);

        if (recipe) {
          // Generate TOC structure for the loaded recipe
          this.recipeTocService.setCurrentRecipe(recipe);
          this.recipeTOC = this.recipeTocService.generateRecipeTOCStructure();
          // Reset scroll state
          this.uiStateService.resetScrollState();
          // Re-observe all sections after recipe loads
          this.observeAllSections();
          // Handle initial URL hash if present
          this.recipeNavigationService.handleInitialHash();
        }

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load recipe details:', error);
        this.uiStateService.setLoading(false);
      }
    });
  }

  /**
   * Load recipe from preview data
   */
  private loadPreviewRecipe(recipeId: string): void {
    const previewData = this.previewService.getPreviewData(recipeId);

    if (previewData) {
      // Convert preview data to RecipeItem format using service
      this.currentRecipe = this.previewSyncService.convertPreviewToRecipeItem(previewData);
      this.uiStateService.setLoading(false);

      if (this.currentRecipe) {
        this.recipeTocService.setCurrentRecipe(this.currentRecipe);
        this.recipeTOC = this.recipeTocService.generateRecipeTOCStructure();
        this.uiStateService.resetScrollState();
        // Re-observe all sections after preview recipe loads
        this.observeAllSections();
        // Handle initial URL hash if present
        this.recipeNavigationService.handleInitialHash();

        // Set initial timestamp in preview sync service
        this.previewSyncService.setCurrentTimestamp(previewData.timestamp);
      }

      this.cdr.markForCheck();
    } else {
      this.uiStateService.setLoading(false);
    }
  }

  /**
   * Handle preview update from preview sync service
   */
  private handlePreviewUpdate(recipe: RecipeItem): void {
    if (!this.currentRecipe) return;

    // Update current recipe
    this.currentRecipe = recipe;

    // Regenerate TOC structure for updated content
    this.recipeTocService.setCurrentRecipe(this.currentRecipe);
    this.recipeTOC = this.recipeTocService.generateRecipeTOCStructure();

    // Re-observe all sections after content update
    this.observeAllSections();

    // Trigger change detection
    this.cdr.markForCheck();
  }

  /**
   * Setup preview synchronization for cross-tab updates
   */
  private setupPreviewSync(recipeId: string): void {
    // Delegate to preview sync service
    this.previewSyncService.setupPreviewSync(recipeId);
  }

  /**
   * Get recipe count
   */
  getRecipeCount(): number {
    return this.recipes.length;
  }

  /**
   * Navigate to home
   */
  goHome(): void {
    this.router.navigate(['/recipes']);
  }

  /**
   * Navigate to category
   */
  goToCategory(categoryName: string): void {
    this.router.navigate(['/recipes', categoryName]);

    if (this.uiStateService.isMobile()) {
      this.closeMobileSidebar();
    }
  }

  /**
   * Navigate to recipe
   */
  goToRecipe(recipe: RecipeItem): void {
    // Check if navigating to the same recipe
    const isSameRecipe = this.currentRecipe &&
                        this.currentRecipe.id === recipe.id &&
                        this.currentRecipe.category === recipe.category;

    this.router.navigate(['/recipes', recipe.category, recipe.slug]);

    // Reset to top section when navigating to a different recipe
    if (!isSameRecipe) {
      this.uiStateService.setActiveSectionId('use-case');
    }

  }


  /**
   * Search recipes
   */
  searchRecipes(query: string): void {
    this.search.query = query;
    this.search.isActive = query.trim().length > 0;
    
    if (this.search.isActive) {
      this.recipeService.searchRecipes(query, this.currentFilter).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (results) => {
          this.search.results = results;
          this.search.hasResults = results.length > 0;
          this.filteredRecipes = this.sortRecipesByCategoryAndTitle(results);
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Search failed:', error);
        }
      });
    } else {
      this.filteredRecipes = this.sortRecipesByCategoryAndTitle(this.recipes);
      this.search.results = [];
      this.cdr.markForCheck();
    }
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.search.query = '';
    this.search.isActive = false;
    this.search.results = [];
    this.filteredRecipes = this.sortRecipesByCategoryAndTitle(this.recipes);
    this.cdr.markForCheck();
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar(): void {
    this.uiStateService.toggleSidebar();
  }

  /**
   * Toggle mobile sidebar
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
   * Get recipes for current view
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
   * Open search overlay
   */
  openSearchOverlay(initialQuery = ''): void {
    this.searchOverlayInitialQuery = initialQuery;
    this.search.isOverlayOpen = true;
    
    // Prevent body scrolling when overlay is open
    document.body.style.overflow = 'hidden';
    
    this.cdr.markForCheck();
  }

  /**
   * Close search overlay
   */
  closeSearchOverlay(): void {
    this.search.isOverlayOpen = false;
    
    // Restore body scrolling
    document.body.style.overflow = '';
    
    this.cdr.markForCheck();
  }

  /**
   * Handle search overlay selection
   */
  handleSearchOverlaySelect(selectedRecipe: SelectedSuggestion): void {
    // Navigate to the selected recipe using slug
    this.router.navigate(['/recipes', selectedRecipe.category, selectedRecipe.slug]);


    this.closeSearchOverlay();
  }







  /**
   * Get visible overview sections with their data for template rendering
   */
  getVisibleOverviewSections() {
    return this.recipeTocService.getVisibleOverviewSections();
  }



  /**
   * Observe all sections for TOC highlighting
   */
  private observeAllSections(): void {
    // Get overview section element IDs
    const overviewElementIds = this.getOverviewSectionsForTOC()
      .map(section => section.elementId || '')
      .filter(id => id.length > 0);

    // Get walkthrough step count
    const walkthroughStepCount = this.walkthroughStepsData.length;

    // Delegate to navigation service
    this.recipeNavigationService.observeAllSections(overviewElementIds, walkthroughStepCount);
  }

  /**
   * Get Overview sections for TOC display
   */
  getOverviewSectionsForTOC(): RecipeSection[] {
    return this.recipeTocService.getOverviewSectionsForTOC();
  }

  /**
   * Get Walkthrough sections for TOC display
   */
  getWalkthroughSectionsForTOC(): RecipeSection[] {
    return this.recipeTocService.getWalkthroughSectionsForTOC();
  }

  /**
   * Navigate to Overview section - Scroll to section anchor
   */
  navigateToOverviewSection(sectionId: string): void {
    this.recipeNavigationService.navigateToOverviewSection(sectionId);
  }

  /**
   * Navigate to Walkthrough section - Scroll to step anchor
   */
  navigateToWalkthroughSection(stepIndex: number): void {
    this.recipeNavigationService.navigateToWalkthroughSection(stepIndex);
  }

  /**
   * Listen for hash changes (back/forward navigation)
   */
  @HostListener('window:hashchange', ['$event'])
  onHashChange(): void {
    this.recipeNavigationService.handleInitialHash();
  }



  // ==================== Walkthrough Step Navigation ====================

  /**
   * Get all walkthrough steps for current recipe
   */
  get walkthroughSteps(): string[] {
    if (!this.currentRecipe?.walkthrough) return [];

    const steps: string[] = [];
    const walkthrough = this.currentRecipe.walkthrough;

    if (Array.isArray(walkthrough)) {
      // New format - return step names
      return walkthrough.map((step, index) => step.step || `Step ${index + 1}`);
    }

    return steps;
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














  /**
   * Handle download link click to bypass Angular routing
   */
  downloadExecutable(url: string, title: string, originalFileName?: string): void {
    if (!url) {
      console.error('Download URL is empty');
      return;
    }
    
    // Replace em dash and other dash characters with underscore in the URL to match actual folder names
    const normalizedUrl = url.replace(/[\u2010-\u2015]/g, '_');

    // Create a temporary anchor element to force download
    const link = document.createElement('a');
    link.href = normalizedUrl;
    // Use original filename if available, otherwise use title
    link.download = originalFileName || title || 'download';
    
    // Use direct download approach without opening in new tab
    // This avoids potential routing issues
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Track download event if analytics service is available
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


  // ==================== TrackBy Functions for Performance ====================

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