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
  RecipeTOCStructure
} from '../shared/models/recipe.model';
import { RecipeService } from '../shared/services/recipe.service';
import { RecipePreviewService, RecipePreviewData } from '../shared/services/recipe-preview.service';
import { SelectedSuggestion } from './recipe-search-overlay/recipe-search-overlay.component';

interface SearchResult {
  item: RecipeItem;
  score: number;
  matchType: 'title' | 'content' | 'category';
  matchedText: string;
  highlightedTitle: string;
  highlightedOverview: string;
}

interface UIState {
  isLoading: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  isMobile: boolean;
  currentView: 'home' | 'category' | 'recipe';
  isPreviewMode: boolean;
  tocHidden: boolean;
  activeRecipeTab: string;
  activeSectionId: string;
  userHasScrolled: boolean;
  scrollTicking: boolean;
  currentWalkthroughStep: number;
  hasScrolledToBottomOnce: boolean;
  hasScrolledToTopOnce: boolean;
  showScrollHint: boolean;
  scrollHintDirection: 'top' | 'bottom' | null;
  scrollHintOpacity: number;
  stepAnimationDirection: 'forward' | 'backward' | null;
  tabAnimationDirection: 'forward' | 'backward' | null;
}

interface SearchState {
  query: string;
  isActive: boolean;
  results: SearchResult[];
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

  // State management
  ui: UIState = {
    isLoading: false,
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    isMobile: false,
    currentView: 'home',
    isPreviewMode: false,
    tocHidden: false,
    activeRecipeTab: 'overview',
    activeSectionId: 'use-case',
    userHasScrolled: false,
    scrollTicking: false,
    currentWalkthroughStep: 0,
    hasScrolledToBottomOnce: false,
    hasScrolledToTopOnce: false,
    showScrollHint: false,
    scrollHintDirection: null,
    scrollHintOpacity: 0,
    stepAnimationDirection: null,
    tabAnimationDirection: null
  };

  private optimizedScrollListener?: () => void;

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
    currentTabId: 'overview',
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupRouteHandling();
    this.loadInitialData();
    this.checkMobileView();
    this.loadSidebarState();
    this.setupOptimizedScrollListener();
    
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



  /**
   * Update scroll hint based on scroll position - Unified logic for both tabs
   */
  private updateScrollHint(): void {
    const scrollTop = document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    const distanceToBottom = documentHeight - (scrollTop + windowHeight);
    const distanceToTop = scrollTop;
    
    // Threshold for showing hint (150px)
    const hintThreshold = 150;
    
    // Determine what actions are available based on current context
    let canScrollDown = false;
    let canScrollUp = false;
    
    if (this.ui.activeRecipeTab === 'overview') {
      // In Overview: can scroll down to switch to Walkthrough
      canScrollDown = this.canSwitchToWalkthrough;
      canScrollUp = false; // No upward action in Overview
    } else if (this.ui.activeRecipeTab === 'walkthrough') {
      // In Walkthrough: check both step navigation and tab switching
      canScrollDown = this.canGoToNextStep; // Can go to next step
      canScrollUp = this.canGoToPreviousStep || this.canSwitchToOverview; // Can go to previous step OR back to Overview
    }
    
    // Determine which hint to show based on distance comparison when both conditions are met
    const canShowTopHint = distanceToTop < hintThreshold && canScrollUp;
    const canShowBottomHint = distanceToBottom < hintThreshold && canScrollDown;
    
    if (canShowTopHint && canShowBottomHint) {
      // Both conditions are met - show the hint for the closer edge
      if (distanceToTop <= distanceToBottom) {
        // User is closer to top - show top hint
        this.ui.showScrollHint = true;
        this.ui.scrollHintDirection = 'top';
        const rawOpacity = (hintThreshold - distanceToTop) / hintThreshold;
        this.ui.scrollHintOpacity = Math.max(0.8, Math.min(1, rawOpacity));
      } else {
        // User is closer to bottom - show bottom hint
        this.ui.showScrollHint = true;
        this.ui.scrollHintDirection = 'bottom';
        const rawOpacity = (hintThreshold - distanceToBottom) / hintThreshold;
        this.ui.scrollHintOpacity = Math.max(0.8, Math.min(1, rawOpacity));
      }
    } else if (canShowBottomHint) {
      // Only bottom hint condition is met
      this.ui.showScrollHint = true;
      this.ui.scrollHintDirection = 'bottom';
      const rawOpacity = (hintThreshold - distanceToBottom) / hintThreshold;
      this.ui.scrollHintOpacity = Math.max(0.8, Math.min(1, rawOpacity));
    } else if (canShowTopHint) {
      // Only top hint condition is met
      this.ui.showScrollHint = true;
      this.ui.scrollHintDirection = 'top';
      const rawOpacity = (hintThreshold - distanceToTop) / hintThreshold;
      this.ui.scrollHintOpacity = Math.max(0.8, Math.min(1, rawOpacity));
    } else {
      // No hint conditions are met
      this.ui.showScrollHint = false;
      this.ui.scrollHintOpacity = 0;
    }
    
    this.cdr.markForCheck();
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
    
    // Clean up scroll listener
    if (this.optimizedScrollListener) {
      window.removeEventListener('scroll', this.optimizedScrollListener);
    }
    
    // Clean up scroll hint state to prevent it from showing on other pages
    this.ui.showScrollHint = false;
    this.ui.scrollHintOpacity = 0;
    this.ui.scrollHintDirection = null;
    
    // Remove body class when leaving recipe pages
    document.body.classList.remove('recipe-page');
  }

  /**
   * Initialize component
   */
  private initializeComponent(): void {
    this.updateUIState({ isLoading: true });
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
          this.ui.isPreviewMode = true;
          this.ui.currentView = 'recipe';
          this.loadPreviewRecipe(previewRecipeId);
          this.setupPreviewSync(previewRecipeId);
        } else {
          this.ui.isPreviewMode = false;
          // Determine current view for normal mode
          if (recipeName) {
            this.ui.currentView = 'recipe';
            this.loadRecipeDetails(category, recipeName);
          } else if (category) {
            this.ui.currentView = 'category';
            this.loadCategoryRecipes(category);
          } else {
            this.ui.currentView = 'home';
            this.loadAllRecipes();
          }
        }
      });
      
      this.cdr.markForCheck();
    });

    // Monitor query parameters for tab and step state
    this.route.queryParamMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(queryParams => {
      const tab = queryParams.get('tab');
      const step = queryParams.get('step');
      
      // Only process if we're viewing a recipe and recipe is loaded
      if (this.ui.currentView === 'recipe' && this.currentRecipe) {
        // Small delay to ensure recipe TOC is generated
        setTimeout(() => {
          this.restoreStateFromUrl(tab, step);
        }, 50);
      }
    });
  }

  /**
   * Update URL parameters without causing navigation
   */
  private updateUrlParams(tab: string | null, step: number | null): void {
    if (!this.navigation.category || !this.navigation.recipeName) {
      return; // Can't update URL without recipe context
    }

    const queryParams: any = {};
    
    // Add tab parameter if not overview (which is default)
    if (tab && tab !== 'overview') {
      queryParams.tab = tab;
    }
    
    // Add step parameter for walkthrough tab
    if (tab === 'walkthrough' && step !== null && step >= 0) {
      queryParams.step = step.toString();
    }
    
    // Update URL without triggering navigation
    // Don't use 'merge' to ensure old parameters are cleared when switching tabs
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: '', // Empty string means replace all query params
      replaceUrl: true // Replace current URL in history instead of adding new entry
    });
  }

  /**
   * Restore UI state from URL parameters
   */
  private restoreStateFromUrl(tab: string | null, step: string | null): void {
    // Restore tab state
    if (tab && (tab === 'overview' || tab === 'walkthrough')) {
      this.ui.activeRecipeTab = tab;
      this.recipeTOC.currentTabId = tab;
    }
    
    // Restore step state for walkthrough
    if (tab === 'walkthrough' && step !== null) {
      const stepIndex = parseInt(step, 10);
      const walkthroughSteps = this.walkthroughSteps;
      
      // Validate step index
      if (!isNaN(stepIndex) && stepIndex >= 0 && stepIndex < walkthroughSteps.length) {
        this.ui.currentWalkthroughStep = stepIndex;
        
        // Update section ID for TOC highlighting
        const sectionId = this.getSectionIdFromWalkthroughStep(stepIndex);
        if (sectionId) {
          this.ui.activeSectionId = sectionId;
          this.recipeTOC.currentSectionId = sectionId;
        }
      }
    }
    
    this.cdr.markForCheck();
  }

  /**
   * Load initial data
   */
  private loadInitialData(): void {
    this.updateUIState({ isLoading: true });
    
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
        if (this.ui.currentView === 'home') {
          this.filteredRecipes = this.sortRecipesByCategoryAndTitle(recipes);
        }
        this.updateUIState({ isLoading: false });
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load recipes:', error);
        this.updateUIState({ isLoading: false });
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
        this.updateUIState({ isLoading: false });
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load recipes:', error);
        this.updateUIState({ isLoading: false });
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
        this.updateUIState({ isLoading: false });
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load category recipes:', error);
        this.updateUIState({ isLoading: false });
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
        this.updateUIState({ isLoading: false });

        if (recipe) {
          // Generate TOC structure for the loaded recipe
          this.generateRecipeTOCStructure();
          // Clear scroll cache for new recipe
          this.clearSectionElementsCache();
          // Reset scroll state
          this.ui.userHasScrolled = false;
        }

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load recipe details:', error);
        this.updateUIState({ isLoading: false });
      }
    });
  }

  /**
   * Load recipe from preview data
   */
  private loadPreviewRecipe(recipeId: string): void {
    const previewData = this.previewService.getPreviewData(recipeId);
    
    if (previewData) {
      // Convert preview data to RecipeItem format
      this.currentRecipe = this.convertPreviewToRecipeItem(previewData);
      this.updateUIState({ isLoading: false });
      
      if (this.currentRecipe) {
        this.generateRecipeTOCStructure();
        this.clearSectionElementsCache();
        this.ui.userHasScrolled = false;
        
        // Set initial timestamp for comparison
        this.setPreviewTimestamp(previewData.timestamp);
      }
    
      this.cdr.markForCheck();
    } else {
      this.updateUIState({ isLoading: false });
    }
  }

  /**
   * Setup preview synchronization for cross-tab updates
   */
  private setupPreviewSync(recipeId: string): void {
    // Enhanced storage event listener
    const handleStorageChange = (event: StorageEvent) => {
      const sessionKey = `recipe-preview-${recipeId}`;
      const backupKey = `backup-recipe-preview-${recipeId}`;

      // Check both sessionStorage and localStorage keys
      if ((event.key === sessionKey || event.key === backupKey) && event.newValue) {
        try {
          const previewData = JSON.parse(event.newValue) as RecipePreviewData;
          this.updatePreviewContent(previewData);
        } catch (error) {
          console.error('❌ Error parsing recipe preview update data:', error);
        }
      }
    };

    // Listen for storage changes (cross-tab communication)
    window.addEventListener('storage', handleStorageChange);

    // Enhanced periodic check for updates (fallback mechanism)
    const updateInterval = setInterval(() => {
      this.checkForPreviewUpdates(recipeId);
    }, 1000);
    
    // Cleanup on destroy
    this.destroy$.subscribe(() => {
      clearInterval(updateInterval);
      window.removeEventListener('storage', handleStorageChange);
    });
  }

  /**
   * Update preview content with new data
   */
  private updatePreviewContent(previewData: RecipePreviewData): void {
    if (!this.currentRecipe) return;

    // Convert and update the current recipe item
    this.currentRecipe = this.convertPreviewToRecipeItem(previewData);
    
    // Update page title if needed
    document.title = `[Preview] ${previewData.title} - Data Sync Pro Recipes`;
    
    // Regenerate TOC structure for updated content
    this.generateRecipeTOCStructure();
    this.clearSectionElementsCache();
    
    // Update timestamp for comparison
    this.setPreviewTimestamp(previewData.timestamp);
    
    // Trigger change detection
    this.cdr.markForCheck();
  }

  /**
   * Check for preview updates via periodic polling (fallback mechanism)
   */
  private checkForPreviewUpdates(recipeId: string): void {
    const currentData = this.previewService.getPreviewData(recipeId);
    if (!currentData || !this.currentRecipe) return;

    const currentTimestamp = this.getPreviewTimestamp();

    if (currentData.timestamp > currentTimestamp) {
      this.updatePreviewContent(currentData);
    }
  }

  /**
   * Get preview timestamp for comparison
   */
  private getPreviewTimestamp(): number {
    return (this.currentRecipe as any)?._previewTimestamp || 0;
  }

  /**
   * Set preview timestamp
   */
  private setPreviewTimestamp(timestamp: number): void {
    if (this.currentRecipe) {
      (this.currentRecipe as any)._previewTimestamp = timestamp;
    }
  }

  /**
   * Convert preview data to RecipeItem format
   */
  private convertPreviewToRecipeItem(previewData: RecipePreviewData): RecipeItem {
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
    
    if (this.ui.isMobile) {
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

    // Only reset to overview tab when navigating to a different recipe
    if (!isSameRecipe) {
      this.ui.activeRecipeTab = 'overview';
      this.ui.activeSectionId = 'use-case';
      this.ui.currentWalkthroughStep = 0;
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
          this.search.results = results.map(result => ({
            item: result,
            score: result.relevanceScore || 0,
            matchType: 'title' as const,
            matchedText: result.highlightedTitle || result.title,
            highlightedTitle: result.highlightedTitle || result.title,
            highlightedOverview: result.highlightedDescription || result.overview
          }));
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
   * Check if mobile view
   */
  private checkMobileView(): void {
    this.updateUIState({ isMobile: window.innerWidth <= 768 });
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar(): void {
    const collapsed = !this.ui.sidebarCollapsed;
    this.updateUIState({ sidebarCollapsed: collapsed });
    localStorage.setItem('recipe-sidebar-collapsed', collapsed.toString());
  }

  /**
   * Toggle mobile sidebar
   */
  toggleMobileSidebar(): void {
    this.updateUIState({ mobileSidebarOpen: !this.ui.mobileSidebarOpen });
  }

  /**
   * Close mobile sidebar
   */
  closeMobileSidebar(): void {
    this.updateUIState({ mobileSidebarOpen: false });
  }

  /**
   * Load sidebar state from localStorage
   */
  private loadSidebarState(): void {
    const savedState = localStorage.getItem('recipe-sidebar-collapsed');
    if (savedState !== null) {
      this.updateUIState({ sidebarCollapsed: savedState === 'true' });
    }
  }

  /**
   * State update helper for OnPush optimization
   */
  private updateUIState(updates: Partial<UIState>): void {
    this.ui = { ...this.ui, ...updates };
    this.cdr.markForCheck();
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
    return this.search.isActive ? this.search.results.map(result => result.item) : this.filteredRecipes;
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
   * Generate recipe TOC structure based on current recipe - Dynamic generation
   */
  generateRecipeTOCStructure(): void {
    if (!this.currentRecipe) {
      this.recipeTOC.tabs = [];
      return;
    }

    const tabs: RecipeTab[] = [];

    // Generate Overview Tab dynamically based on available content
    const overviewSections = this.generateOverviewSections();
    tabs.push({
      id: 'overview',
      title: 'Overview',
      sections: overviewSections
    });

    // Generate Walkthrough Tab dynamically
    const walkthroughSections = this.generateWalkthroughSections();
    if (walkthroughSections.length > 0) {
      tabs.push({
        id: 'walkthrough',
        title: 'Walkthrough',
        sections: walkthroughSections
      });
    }

    this.recipeTOC.tabs = tabs;
    this.recipeTOC.currentTabId = this.ui.activeRecipeTab;
    this.recipeTOC.currentSectionId = this.ui.activeSectionId;
  }

  /**
   * Configuration for overview sections
   */
  private readonly overviewSectionConfigs = [
    {
      id: 'overview',
      title: 'Overview',
      elementId: 'recipe-overview',
      contentType: 'html',
      isVisible: () => this.hasValidOverview(),
      getData: () => this.currentRecipe?.overview,
      alwaysShow: true,
      isHighlight: true
    },
    {
      id: 'when-to-use',
      title: 'General Use Case',
      elementId: 'recipe-when-to-use',
      contentType: 'html',
      isVisible: () => this.hasValidWhenToUse(),
      getData: () => this.currentRecipe?.whenToUse
    },
    {
      id: 'dsp-versions',
      title: 'Supported DSP Versions',
      elementId: 'recipe-dsp-versions',
      contentType: 'tag-list',
      isVisible: () => !!(this.currentRecipe?.DSPVersions?.length && this.currentRecipe.DSPVersions.length > 0),
      getData: () => this.currentRecipe?.DSPVersions,
      tagClass: 'version-tag'
    },
    {
      id: 'prerequisites',
      title: 'Prerequisites',
      elementId: 'recipe-prerequisites',
      contentType: 'prerequisites',
      isVisible: () => this.hasArrayPrerequisites(),
      getData: () => this.getValidPrerequisites()
    },
    {
      id: 'building-permissions',
      title: 'Permission Sets for Building',
      elementId: 'recipe-building-permissions',
      contentType: 'list',
      isVisible: () => this.getPermissionSetsForBuilding().length > 0,
      getData: () => this.getPermissionSetsForBuilding()
    },
    {
      id: 'using-permissions',
      title: 'Permission Sets for Using',
      elementId: 'recipe-using-permissions',
      contentType: 'list',
      isVisible: () => this.getPermissionSetsForUsing().length > 0,
      getData: () => this.getPermissionSetsForUsing()
    },
    {
      id: 'download-executables',
      title: 'Download Executable Files',
      elementId: 'recipe-download-executables',
      contentType: 'download-list',
      isVisible: () => this.hasValidDownloadableExecutables(),
      getData: () => this.getValidDownloadableExecutables()
    },
    {
      id: 'related-recipes',
      title: 'Related Recipes',
      elementId: 'recipe-related',
      contentType: 'link-list',
      isVisible: () => this.hasValidRelatedRecipes(),
      getData: () => this.getValidRelatedRecipes()
    },
  ];

  /**
   * Generate Overview sections dynamically based on available content
   */
  private generateOverviewSections(): RecipeSection[] {
    const sections: RecipeSection[] = [];

    // Iterate through configuration and add visible sections
    for (const config of this.overviewSectionConfigs) {
      // Check if section should be visible
      if (config.alwaysShow || (config.isVisible && config.isVisible())) {
        sections.push({
          id: config.id,
          title: config.title,
          elementId: config.elementId
        });
      }
    }

    return sections;
  }

  /**
   * Get visible overview sections with their data for template rendering
   */
  getVisibleOverviewSections() {
    return this.overviewSectionConfigs.filter(config => 
      config.alwaysShow || (config.isVisible && config.isVisible())
    ).map(config => ({
      ...config,
      data: config.getData ? config.getData() : null
    }));
  }

  /**
   * Generate Walkthrough sections dynamically based on available content
   */
  private generateWalkthroughSections(): RecipeSection[] {
    const sections: RecipeSection[] = [];
    const walkthrough = this.currentRecipe?.walkthrough;

    // Handle new array format
    if (Array.isArray(walkthrough)) {
      walkthrough.forEach((step, index) => {
        sections.push({
          id: `step-${index}`,
          title: step.step || `Step ${index + 1}`,
          elementId: `recipe-step-${index}`
        });
      });
    }
    return sections;
  }



  // ==================== Scroll Tracking Methods ====================

  /**
   * Setup optimized scroll listener for section highlighting
   */
  private setupOptimizedScrollListener(): void {
    if (typeof window === 'undefined') return;
    
    this.optimizedScrollListener = () => {
      // Mark that user has scrolled - this enables TOC highlighting
      if (!this.ui.userHasScrolled) {
        this.ui.userHasScrolled = true;
      }
      
      if (!this.ui.scrollTicking) {
        requestAnimationFrame(() => {
          this.handleOptimizedScroll();
          this.ui.scrollTicking = false;
        });
        this.ui.scrollTicking = true;
      }
    };
    
    window.addEventListener('scroll', this.optimizedScrollListener, { passive: true });
  }

  /**
   * Handle scroll events and update active section
   */
  private handleOptimizedScroll(): void {
    // Reset scroll tracking states when user leaves bottom/top areas
    if (this.showRecipeDetails) {
      this.updateScrollHint();
    }
  }

  /**
   * Clear section elements cache (call when recipe changes)
   */
  private clearSectionElementsCache(): void {
    // Cache clearing placeholder - can be expanded if needed
  }



  /**
   * Get Overview sections for TOC display
   */
  getOverviewSectionsForTOC(): RecipeSection[] {
    const overviewTab = this.recipeTOC.tabs.find(tab => tab.id === 'overview');
    return overviewTab ? overviewTab.sections : [];
  }

  /**
   * Get Walkthrough sections for TOC display
   */
  getWalkthroughSectionsForTOC(): RecipeSection[] {
    const walkthroughTab = this.recipeTOC.tabs.find(tab => tab.id === 'walkthrough');
    return walkthroughTab ? walkthroughTab.sections : [];
  }

  /**
   * Navigate to Overview section
   */
  navigateToOverviewSection(): void {
    // Switch to overview tab if not already there
    if (this.ui.activeRecipeTab !== 'overview') {
      this.ui.activeRecipeTab = 'overview';
      this.recipeTOC.currentTabId = 'overview';
    }
  }

  /**
   * Navigate to Walkthrough section
   */
  navigateToWalkthroughSection(stepIndex: number): void {
    // Switch to walkthrough tab if not already there
    if (this.ui.activeRecipeTab !== 'walkthrough') {
      this.ui.activeRecipeTab = 'walkthrough';
      this.recipeTOC.currentTabId = 'walkthrough';
      this.ui.currentWalkthroughStep = stepIndex;
    } else {
      this.ui.currentWalkthroughStep = stepIndex;
    }
    
    // Update URL with new step
    this.updateUrlParams('walkthrough', stepIndex);
    
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
   * Get current step data
   */
  get currentStepData(): any {
    if (!this.currentRecipe?.walkthrough) return null;
    
    // Handle new array format
    if (Array.isArray(this.currentRecipe.walkthrough)) {
      const steps = this.currentRecipe.walkthrough;
      if (this.ui.currentWalkthroughStep >= 0 && this.ui.currentWalkthroughStep < steps.length) {
        return steps[this.ui.currentWalkthroughStep];
      }
      return null;
    }

  }



  /**
   * Get section ID from walkthrough step index
   */
  private getSectionIdFromWalkthroughStep(stepIndex: number): string {
    if (!this.currentRecipe?.walkthrough) return '';
      if (stepIndex >= 0 && stepIndex < this.currentRecipe.walkthrough.length) {
        return `step-${stepIndex}`;
      }
      return '';
  }

  /**
   * Sync TOC section with current walkthrough step
   */
  private syncTOCSectionWithWalkthrough(): void {
    if (this.ui.activeRecipeTab === 'walkthrough') {
      const sectionId = this.getSectionIdFromWalkthroughStep(this.ui.currentWalkthroughStep);
      if (sectionId) {
        this.ui.activeSectionId = sectionId;
        this.recipeTOC.currentSectionId = sectionId;
      }
    }
  }

  /**
   * Navigate to next step with section-based scrolling
   */
  goToNextWalkthroughStep(): void {
    const steps = this.walkthroughSteps;
    if (this.ui.currentWalkthroughStep < steps.length - 1) {
      this.ui.stepAnimationDirection = 'forward';
      this.ui.currentWalkthroughStep++;
      
      // Reset scroll tracking states when navigating to new step
      this.ui.hasScrolledToBottomOnce = false;
      this.ui.hasScrolledToTopOnce = false;
      
      this.syncTOCSectionWithWalkthrough();
      this.updateUrlParams('walkthrough', this.ui.currentWalkthroughStep);
      this.cdr.markForCheck();
      
      this.scrollToTop();
  
      
      // Reset animation direction after animation completes
      setTimeout(() => {
        this.ui.stepAnimationDirection = null;
        this.cdr.markForCheck();
      }, 950); // Slightly after animation ends
    }
  }

  /**
   * Navigate to previous step with section-based scrolling
   */
  goToPreviousWalkthroughStep(): void {
    if (this.ui.currentWalkthroughStep > 0) {
      this.ui.stepAnimationDirection = 'backward';
      this.ui.currentWalkthroughStep--;
      
      // Reset scroll tracking states when navigating to new step
      this.ui.hasScrolledToBottomOnce = false;
      this.ui.hasScrolledToTopOnce = false;
      
      this.syncTOCSectionWithWalkthrough();
      this.updateUrlParams('walkthrough', this.ui.currentWalkthroughStep);
      this.cdr.markForCheck();
      

      this.scrollToTop();
      
      
      // Reset animation direction after animation completes
      setTimeout(() => {
        this.ui.stepAnimationDirection = null;
        this.cdr.markForCheck();
      }, 950); // Slightly after animation ends
    }
  }

  /**
   * Handle scroll hint click - unified logic for both tabs
   */
  onScrollHintClick(): void {
    // Hide hint immediately
    this.ui.showScrollHint = false;
    this.ui.scrollHintOpacity = 0;
    
    // Determine action based on current context
    if (this.ui.activeRecipeTab === 'overview') {
      // In Overview: clicking bottom hint switches to Walkthrough
      if (this.ui.scrollHintDirection === 'bottom' && this.canSwitchToWalkthrough) {
        // Switch to Walkthrough tab at first step
        this.ui.currentWalkthroughStep = 0;
        
        // Scroll to first step section
        setTimeout(() => {
            this.scrollToTop();
          setTimeout(() => {
            this.updateScrollHint();
          }, 200);
        }, 100);
      }
    } else if (this.ui.activeRecipeTab === 'walkthrough') {
      // In Walkthrough: handle both step navigation and tab switching
      if (this.ui.scrollHintDirection === 'bottom') {
        // Navigate to next step
        if (this.canGoToNextStep) {
          this.goToNextWalkthroughStep();
          
          // Re-evaluate scroll hints after step switch complete
          setTimeout(() => {
            this.updateScrollHint();
          }, 200);
        }
      } else if (this.ui.scrollHintDirection === 'top') {
        // Check if we should go back to Overview or previous step
        if (this.ui.currentWalkthroughStep === 0 && this.canSwitchToOverview) {
          // Switch back to Overview
          
          // Scroll to top of overview for intuitive navigation
          setTimeout(() => {
            this.scrollToTop();
            
            // Re-evaluate scroll hints after tab switch and scroll complete
            setTimeout(() => {
              this.updateScrollHint();
            }, 200);
          }, 100);
        } else if (this.canGoToPreviousStep) {
          // Navigate to previous step
          this.goToPreviousWalkthroughStep();
          
          // Re-evaluate scroll hints after step switch complete
          setTimeout(() => {
            this.updateScrollHint();
          }, 200);
        }
      }
    }
  }

  /**
   * Navigate to specific step with section-based scrolling
   */
  goToWalkthroughStep(stepIndex: number): void {
    const steps = this.walkthroughSteps;
    if (stepIndex >= 0 && stepIndex < steps.length) {
      this.ui.currentWalkthroughStep = stepIndex;
      this.syncTOCSectionWithWalkthrough();
      this.updateUrlParams('walkthrough', this.ui.currentWalkthroughStep);
      this.cdr.markForCheck();

      this.scrollToTop();
      
      
      // Reset animation direction after animation completes
      setTimeout(() => {
        this.ui.stepAnimationDirection = null;
        this.cdr.markForCheck();
      }, 950); // Slightly after animation ends
    }
  }


  /**
   * Check if can go to next step
   */
  get canGoToNextStep(): boolean {
    return this.ui.currentWalkthroughStep < this.walkthroughSteps.length - 1;
  }

  /**
   * Check if can go to previous step
   */
  get canGoToPreviousStep(): boolean {
    return this.ui.currentWalkthroughStep > 0;
  }

  /**
   * Check if can switch from Overview to Walkthrough
   */
  get canSwitchToWalkthrough(): boolean {
    return this.ui.activeRecipeTab === 'overview' && this.walkthroughSteps.length > 0;
  }

  /**
   * Check if can switch from Walkthrough back to Overview
   */
  get canSwitchToOverview(): boolean {
    return this.ui.activeRecipeTab === 'walkthrough' && this.ui.currentWalkthroughStep === 0;
  }

  /**
   * Get previous step title
   */
  get previousStepTitle(): string {
    if (!this.canGoToPreviousStep) return 'Previous';
    const prevIndex = this.ui.currentWalkthroughStep - 1;
    return this.getStepTitleByIndex(prevIndex);
  }

  /**
   * Get next step title  
   */
  get nextStepTitle(): string {
    if (!this.canGoToNextStep) return 'Next';
    const nextIndex = this.ui.currentWalkthroughStep + 1;
    return this.getStepTitleByIndex(nextIndex);
  }

  /**
   * Get step title by index
   */
  private getStepTitleByIndex(index: number): string {
    const step = this.currentRecipe?.walkthrough[index];
    return step?.step || `Step ${index + 1}`;
  }

  /**
   * Scroll to top of page smoothly
   */
  private scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  /**
   * Check if current recipe has array prerequisites with valid items
   */
  hasArrayPrerequisites(): boolean {
    if (!this.currentRecipe?.prerequisites || !Array.isArray(this.currentRecipe.prerequisites)) {
      return false;
    }
    
    // Check if there's at least one prerequisite with actual content
    return this.currentRecipe.prerequisites.some(prereq => 
      (prereq.description && prereq.description.trim().length > 0) ||
      (prereq.quickLinks && prereq.quickLinks.length > 0 && 
       prereq.quickLinks.some(link => link.title && link.title.trim().length > 0))
    );
  }

  /**
   * Get permission sets for building
   */
  getPermissionSetsForBuilding(): string[] {
    if (!this.currentRecipe) return [];
    
    // New format - extract from prerequisites array
    const buildingPermissions: string[] = [];
    if (Array.isArray(this.currentRecipe.prerequisites)) {
      this.currentRecipe.prerequisites.forEach(prereq => {
        if (prereq.description.toLowerCase().includes('permission') && 
            prereq.description.toLowerCase().includes('building')) {
          // This is a simplified extraction - you might want to improve this logic
          buildingPermissions.push(prereq.description);
        }
      });
    }
    
    return buildingPermissions;
  }

  /**
   * Get permission sets for using
   */
  getPermissionSetsForUsing(): string[] {
    if (!this.currentRecipe) return [];

    // New format - extract from prerequisites array
    const usingPermissions: string[] = [];
    if (Array.isArray(this.currentRecipe.prerequisites)) {
      this.currentRecipe.prerequisites.forEach(prereq => {
        if (prereq.description.toLowerCase().includes('permission') && 
            prereq.description.toLowerCase().includes('using')) {
          // This is a simplified extraction - you might want to improve this logic
          usingPermissions.push(prereq.description);
        }
      });
    }
    
    return usingPermissions;
  }

  /**
   * Check if current recipe has valid overview
   */
  hasValidOverview(): boolean {
    const overview = this.currentRecipe?.overview;
    return !!(overview && overview.trim().length > 0);
  }

  /**
   * Check if current recipe has valid when to use
   */
  hasValidWhenToUse(): boolean {
    const whenToUse = this.currentRecipe?.whenToUse;
    return !!(whenToUse && whenToUse.trim().length > 0);
  }

  /**
   * Check if current recipe has valid downloadable executables
   */
  hasValidDownloadableExecutables(): boolean {
    const executables = this.currentRecipe?.downloadableExecutables;
    return !!(executables && executables.length > 0 && 
              executables.some(exe => 
                (exe.filePath && exe.filePath.trim().length > 0) 
              ));
  }

  /**
   * Get valid downloadable executables (with non-empty title and url or filePath)
   */
  getValidDownloadableExecutables() {
    const executables = this.currentRecipe?.downloadableExecutables || [];
    return executables.filter(exe => 
      // Support new format with filePath
      (exe.filePath && exe.filePath.trim().length > 0)
    ).map(exe => {
      // Transform new format to legacy format for template compatibility
      if (exe.filePath && !exe.title && !exe.url) {
        const fileName = exe.filePath.split('/').pop() || exe.filePath;
        // Remove extension and keep the original filename (including special characters)
        const titleFromFileName = fileName.replace(/\.[^/.]+$/, '');
        
        // Build correct assets path for download
        const correctUrl = this.buildAssetPath(exe.filePath);
        
        return {
          ...exe,
          title: titleFromFileName,
          url: correctUrl,
          // Keep original filename for download attribute
          originalFileName: fileName
        };
      }
      return exe;
    });
  }

  /**
   * Build correct asset path for recipe files
   */
  private buildAssetPath(filePath: string): string {
    if (!this.currentRecipe || !filePath) return filePath;
    
    // If filePath already starts with '/assets/', return as is
    if (filePath.startsWith('/assets/')) {
      return filePath;
    }
    
    // If filePath already starts with 'assets/', make it absolute
    if (filePath.startsWith('assets/')) {
      return `/${filePath}`;
    }
    
    // If filePath is absolute URL, return as is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    // Build the correct absolute assets path: /assets/recipes/{recipeId}/{filePath}
    // Replace em dash and other dash characters with underscore to match actual folder names
    const normalizedRecipeId = this.currentRecipe.id.replace(/[\u2010-\u2015]/g, '_');
    return `/assets/recipes/${normalizedRecipeId}/${filePath}`;
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

  /**
   * Check if current recipe has valid related recipes
   */
  hasValidRelatedRecipes(): boolean {
    const related = this.currentRecipe?.relatedRecipes;
    return !!(related && related.length > 0 && 
              related.some(recipe => recipe.title && recipe.title.trim().length > 0 && 
                                    recipe.url && recipe.url.trim().length > 0));
  }

  /**
   * Get valid related recipes (with non-empty title and url)
   */
  getValidRelatedRecipes() {
    const related = this.currentRecipe?.relatedRecipes || [];
    return related.filter(recipe => recipe.title && recipe.title.trim().length > 0 && 
                                   recipe.url && recipe.url.trim().length > 0);
  }

  /**
   * Get valid prerequisites (with non-empty content)
   */
  getValidPrerequisites() {
    const prerequisites = this.currentRecipe?.prerequisites || [];
    if (!Array.isArray(prerequisites)) return [];
    
    return prerequisites.filter(prereq => 
      (prereq.description && prereq.description.trim().length > 0) ||
      (prereq.quickLinks && prereq.quickLinks.length > 0 && 
       prereq.quickLinks.some(link => link.title && link.title.trim().length > 0))
    );
  }

}