import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewEncapsulation,
  HostListener
} from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

import {
  RecipeItem,
  RecipeCategory,
  RecipeFilter,
  RecipeProgress,
  RecipeNavigationState,
  RecipeSection,
  RecipeTab,
  RecipeTOCStructure,
  LegacyRecipeWalkthrough
} from '../shared/models/recipe.model';
import { RecipeService } from '../shared/services/recipe.service';
import { SelectedRecipe } from './recipe-search-overlay/recipe-search-overlay.component';

interface UIState {
  isLoading: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  mobileTOCOpen: boolean;
  isMobile: boolean;
  currentView: 'home' | 'category' | 'recipe';
  tocHidden: boolean;
  tocInFooterZone: boolean;
  tocFooterApproaching: boolean;
  activeRecipeTab: string; // Used for content display - determines which tab content to show
  activeSectionId: string; // Used for section highlighting within a tab
  highlightedTOCTab: string; // Used for TOC visual highlighting - can be empty to show no tab highlight
  // expandedTabs: Set<string>; // No longer used since TOC doesn't show tabs
  userHasScrolled: boolean;
  scrollTicking: boolean;
  disableScrollHighlight: boolean;
  // Walkthrough step navigation
  currentWalkthroughStep: number;
  walkthroughStepsCompleted: Set<number>;
}

interface TOCPaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

interface SearchState {
  query: string;
  isActive: boolean;
  results: RecipeItem[];
  hasResults: boolean;
  isOverlayOpen: boolean;
}

@Component({
  selector: 'app-recipes',
  templateUrl: './recipes.component.html',
  styleUrls: ['./recipes.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ height: '0', opacity: 0, overflow: 'hidden' }),
        animate('200ms ease-in', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-out', style({ height: '0', opacity: 0, overflow: 'hidden' }))
      ])
    ])
  ]
})
export class RecipesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State management
  ui: UIState = {
    isLoading: false,
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    mobileTOCOpen: false,
    isMobile: false,
    currentView: 'home',
    tocHidden: false,
    tocInFooterZone: false,
    tocFooterApproaching: false,
    activeRecipeTab: 'overview',
    activeSectionId: 'use-case',
    highlightedTOCTab: '', // No longer used since TOC doesn't show tabs
    userHasScrolled: false,
    scrollTicking: false,
    disableScrollHighlight: false,
    // Walkthrough step navigation
    currentWalkthroughStep: 0,
    walkthroughStepsCompleted: new Set<number>()
  };

  // TOC pagination state
  tocPagination: TOCPaginationState = {
    currentPage: 1,
    itemsPerPage: 8,
    totalPages: 1,
    startIndex: 0,
    endIndex: 0
  };

  // TOC data
  private _cachedTrendingRecipes?: RecipeItem[];
  private _lastRecipesLength?: number;
  
  // Scroll tracking and caching
  private cachedSectionElements: Element[] | null = null;
  private cachedSectionPositions: Map<string, number> = new Map();
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
    private meta: Meta,
    private title: Title,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupRouteHandling();
    this.loadInitialData();
    this.checkMobileView();
    this.loadSidebarState();
    this.loadTOCState();
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
   * Setup route parameter handling
   */
  private setupRouteHandling(): void {
    // Monitor both params and query params
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const category = params.get('category') || '';
      const recipeName = params.get('recipeName') || '';
      
      this.navigation = { category, recipeName };
      
      // Determine current view
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
      
      this.updatePageMetadata();
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
          this.filteredRecipes = recipes;
        }
        this.resetTOCPagination();
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
        this.filteredRecipes = recipes;
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
        this.filteredRecipes = recipes;
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
   * Load specific recipe details
   */
  private loadRecipeDetails(category: string, recipeName: string): void {
    this.recipeService.getRecipe(category, recipeName).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recipe) => {
        this.currentRecipe = recipe;
        this.updateUIState({ isLoading: false });
        
        if (recipe) {
          this.trackRecipeView(recipe);
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
    console.log('Navigating to recipe:', recipe.title, '(id:', recipe.id, ') Category:', recipe.category);
    
    // Check if navigating to the same recipe
    const isSameRecipe = this.currentRecipe && 
                        this.currentRecipe.id === recipe.id && 
                        this.currentRecipe.category === recipe.category;
    
    this.router.navigate(['/recipes', recipe.category, recipe.id]);
    
    // Only reset to overview tab when navigating to a different recipe
    if (!isSameRecipe) {
      this.ui.activeRecipeTab = 'overview';
      this.ui.activeSectionId = 'use-case';
      this.ui.currentWalkthroughStep = 0;
    }
    
    if (this.ui.isMobile) {
      this.closeMobileSidebar();
    }
  }

  /**
   * Change recipe tab - Optimized for instant switching
   */
  changeRecipeTab(tabName: string): void {
    console.log('Changing recipe tab to:', tabName);
    
    // Set active tab for content display
    this.ui.activeRecipeTab = tabName;
    this.recipeTOC.currentTabId = tabName;
    
    // Clear active section when clicking on tab directly
    this.ui.activeSectionId = '';
    this.recipeTOC.currentSectionId = '';
    
    // Update URL with tab information
    this.updateUrlParams(tabName, null);
    
    // If switching to walkthrough tab, sync with current step
    if (tabName === 'walkthrough') {
      this.syncTOCSectionWithWalkthrough();
      // Update URL with current step
      this.updateUrlParams(tabName, this.ui.currentWalkthroughStep);
    }
    
    // Clear section cache when switching tabs since DOM content changes
    this.clearSectionElementsCache();
    
    // Close mobile TOC after tab change
    if (this.ui.isMobile) {
      this.closeMobileTOC();
    }
    
    // Trigger immediate UI update
    this.cdr.markForCheck();
    
    // Refresh cache after UI updates for the new active tab
    setTimeout(() => {
      this.refreshSectionElementsCacheForActiveTab();
    }, 100);
  }

  /**
   * Change recipe section
   */
  changeRecipeSection(sectionId: string): void {
    console.log('Changing recipe section to:', sectionId);
    
    this.ui.activeSectionId = sectionId;
    this.recipeTOC.currentSectionId = sectionId;
    
    // Clear TOC tab highlighting when selecting a specific section
    // Keep activeRecipeTab for content display, but clear highlightedTOCTab for visual highlighting
    this.ui.highlightedTOCTab = '';
    
    // Ensure the parent tab is expanded and set as active for content display
    this.ensureParentTabActive(sectionId);
    
    // Check if this is a walkthrough section and navigate to corresponding step
    if (this.ui.activeRecipeTab === 'walkthrough') {
      const stepIndex = this.getWalkthroughStepFromSectionId(sectionId);
      if (stepIndex >= 0) {
        console.log('Navigating to walkthrough step:', stepIndex);
        this.ui.currentWalkthroughStep = stepIndex;
      }
    }
    
    // Temporarily disable scroll highlighting to avoid conflicts during navigation
    this.ui.disableScrollHighlight = true;
    
    // Scroll to the section element
    this.scrollToSection(sectionId);
    
    // Re-enable scroll highlighting after navigation completes
    setTimeout(() => {
      this.ui.disableScrollHighlight = false;
    }, 1000);
    
    this.cdr.markForCheck();
  }

  /**
   * Ensure the parent tab of a section is expanded and active for content display
   */
  private ensureParentTabActive(sectionId: string): void {
    const parentTab = this.recipeTOC.tabs.find(tab => 
      tab.sections.some(section => section.id === sectionId)
    );
    
    if (parentTab) {
      console.log('Ensuring parent tab is active for content display and expanded for section:', sectionId);
      // Set the parent tab as active for content display (needed for *ngIf in template)
      this.ui.activeRecipeTab = parentTab.id;
      this.recipeTOC.currentTabId = parentTab.id;
      
      // Parent tab is automatically active for content display
      
      // Note: highlightedTOCTab is handled separately and should be empty when a section is selected
    }
  }

  /**
   * Toggle tab expansion in TOC - No longer needed since tabs are not shown in TOC
   */
  toggleTabExpansion(tabId: string): void {
    // This method is no longer used since TOC doesn't show tabs
    console.warn('toggleTabExpansion is deprecated - TOC no longer shows tabs');
  }

  /**
   * Simple and reliable section scrolling
   */
  private scrollToSection(sectionId: string): void {
    const section = this.recipeTOC.tabs
      .flatMap(tab => tab.sections)
      .find(s => s.id === sectionId);
      
    if (section?.elementId) {
      const element = document.getElementById(section.elementId);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
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
          this.filteredRecipes = results;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Search failed:', error);
        }
      });
    } else {
      this.filteredRecipes = this.recipes;
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
    this.filteredRecipes = this.recipes;
    this.cdr.markForCheck();
  }

  /**
   * Track recipe view
   */
  private trackRecipeView(recipe: RecipeItem): void {
    this.recipeService.trackRecipeEvent({
      type: 'view',
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeCategory: recipe.category,
      timestamp: new Date()
    });
  }

  /**
   * Update recipe progress
   */
  updateRecipeProgress(recipe: RecipeItem, stepNumber: number): void {
    const progress: RecipeProgress = {
      recipeId: recipe.id,
      currentStep: stepNumber,
      completedSteps: recipe.completedSteps || [],
      timeSpent: 0, // Could be calculated based on time tracking
      lastAccessed: new Date()
    };
    
    if (!progress.completedSteps.includes(stepNumber)) {
      progress.completedSteps.push(stepNumber);
    }
    
    this.recipeService.saveRecipeProgress(progress);
    
    // Update local recipe state
    recipe.currentStep = stepNumber;
    recipe.completedSteps = progress.completedSteps;
    
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
   * Update page metadata
   */
  private updatePageMetadata(): void {
    let pageTitle = 'Recipes - Data Sync Pro';
    let pageDescription = 'Step-by-step recipes for Data Sync Pro implementation';

    if (this.currentRecipe) {
      pageTitle = `${this.currentRecipe.title} - Recipe - Data Sync Pro`;
      pageDescription = this.currentRecipe.description || this.currentRecipe.usecase;
    } else if (this.navigation.category) {
      const category = this.categories.find(cat => cat.name === this.navigation.category);
      if (category) {
        pageTitle = `${category.displayName} Recipes - Data Sync Pro`;
        pageDescription = category.description;
      }
    }

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: pageDescription });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: pageDescription });
    this.meta.updateTag({ property: 'og:url', content: window.location.href });
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
   * Get category icon for sidebar - Updated with more semantic and visually appealing icons
   */
  getCategoryIcon(categoryName: string): string {
    switch (categoryName) {
      case 'action-button': return 'touch_app';        // More intuitive touch/action icon
      case 'batch': return 'batch_prediction';         // Specialized batch processing icon  
      case 'data-list': return 'view_list';           // Clearer list visualization icon
      case 'data-loader': return 'cloud_upload';      // Modern cloud upload icon
      case 'triggers': return 'flash_on';             // Dynamic lightning icon
      default: return 'article';                      // More semantic document icon
    }
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
  handleSearchOverlaySelect(selectedRecipe: SelectedRecipe): void {
    // Navigate to the selected recipe
    this.router.navigate(['/recipes', selectedRecipe.category, selectedRecipe.id]);
    
    // Track search usage
    this.recipeService.trackRecipeEvent({
      type: 'search',
      recipeId: selectedRecipe.id,
      recipeTitle: selectedRecipe.title,
      recipeCategory: selectedRecipe.category,
      searchQuery: this.searchOverlayInitialQuery,
      timestamp: new Date()
    });
    
    this.closeSearchOverlay();
  }

  // ==================== TOC Methods ====================

  /**
   * Check if TOC should be shown
   */
  get shouldShowTOC(): boolean {
    // Don't show during search
    if (this.search.isActive || this.search.query.trim()) return false;
    
    // Show on home page if we have trending recipes
    if (this.showHome) return this.trendingRecipes.length > 0;
    
    // Show on recipe detail page
    if (this.showRecipeDetails) return true;
    
    // Show on category pages if we have at least one recipe
    return (!!this.navigation.category) && this.currentRecipes.length >= 1;
  }

  /**
   * Get trending recipes for home page TOC
   */
  get trendingRecipes(): RecipeItem[] {
    if (!this._cachedTrendingRecipes || this._lastRecipesLength !== this.recipes.length) {
      // Sort by estimated time (shorter first) and category diversity
      this._cachedTrendingRecipes = [...this.recipes]
        .sort((a, b) => {
          // Sort by title alphabetically
          // Finally by title alphabetically
          return a.title.localeCompare(b.title);
        })
        .slice(0, 20); // Limit to 20 trending recipes
      
      this._lastRecipesLength = this.recipes.length;
    }
    return this._cachedTrendingRecipes;
  }

  /**
   * Get current TOC title
   */
  get currentTOCTitle(): string {
    if (this.showHome) return 'Trending recipes';
    if (this.navigation.category) {
      const category = this.categories.find(c => c.name === this.navigation.category);
      return category ? `${category.displayName} Recipes` : 'Category Recipes';
    }
    return 'Recipes';
  }

  /**
   * Get TOC item count
   */
  get tocItemCount(): number {
    if (this.showHome) return this.trendingRecipes.length;
    return this.currentRecipes.length;
  }

  /**
   * Get recipe tab count for TOC
   */
  getRecipeTabCount(): number {
    return 2; // Overview and Walkthrough are always available (Download merged into Overview)
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
      icon: 'article',
      description: '',
      sections: overviewSections
    });

    // Generate Walkthrough Tab dynamically
    const walkthroughSections = this.generateWalkthroughSections();
    if (walkthroughSections.length > 0) {
      tabs.push({
        id: 'walkthrough',
        title: 'Walkthrough',
        icon: 'timeline',
        description: 'Step-by-step Guide',
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
      id: 'use-case',
      title: 'Use Case',
      icon: 'lightbulb',
      elementId: 'recipe-use-case',
      contentType: 'use-case-highlight',
      isVisible: () => this.hasValidUseCase(),
      getData: () => this.currentRecipe?.safeUsecase || this.currentRecipe?.safeUseCase,
      alwaysShow: true,
      isHighlight: true
    },
    {
      id: 'dsp-versions',
      title: 'Supported DSP Versions',
      icon: 'verified',
      elementId: 'recipe-dsp-versions',
      contentType: 'tag-list',
      isVisible: () => !!(this.currentRecipe?.DSPVersions?.length && this.currentRecipe.DSPVersions.length > 0),
      getData: () => this.currentRecipe?.DSPVersions,
      tagClass: 'version-tag'
    },
    {
      id: 'connection',
      title: 'Connection Type',
      icon: 'link',
      elementId: 'recipe-connection',
      contentType: 'text',
      isVisible: () => this.hasValidConnection(),
      getData: () => this.currentRecipe?.connection
    },
    {
      id: 'direction',
      title: 'Direction',
      icon: 'trending_flat',
      elementId: 'recipe-direction',
      contentType: 'html',
      isVisible: () => this.hasValidDirection(),
      getData: () => this.currentRecipe?.safeDirection || this.currentRecipe?.direction
    },
    {
      id: 'prerequisites',
      title: 'Prerequisites',
      icon: 'checklist',
      elementId: 'recipe-prerequisites',
      contentType: 'prerequisites',
      isVisible: () => this.hasArrayPrerequisites(),
      getData: () => this.getValidPrerequisites()
    },
    {
      id: 'building-permissions',
      title: 'Permission Sets for Building',
      icon: 'build',
      elementId: 'recipe-building-permissions',
      contentType: 'list',
      isVisible: () => this.getPermissionSetsForBuilding().length > 0,
      getData: () => this.getPermissionSetsForBuilding()
    },
    {
      id: 'using-permissions',
      title: 'Permission Sets for Using',
      icon: 'group',
      elementId: 'recipe-using-permissions',
      contentType: 'list',
      isVisible: () => this.getPermissionSetsForUsing().length > 0,
      getData: () => this.getPermissionSetsForUsing()
    },
    {
      id: 'download-executables',
      title: 'Download Executable Files',
      icon: 'download',
      elementId: 'recipe-download-executables',
      contentType: 'download-list',
      isVisible: () => this.hasValidDownloadableExecutables(),
      getData: () => this.getValidDownloadableExecutables()
    },
    {
      id: 'related-recipes',
      title: 'Related Recipes',
      icon: 'link',
      elementId: 'recipe-related',
      contentType: 'link-list',
      isVisible: () => this.hasValidRelatedRecipes(),
      getData: () => this.getValidRelatedRecipes()
    },
    {
      id: 'keywords',
      title: 'Keywords',
      icon: 'label',
      elementId: 'recipe-keywords',
      contentType: 'tag-list',
      isVisible: () => !!(this.currentRecipe?.keywords?.length && this.currentRecipe.keywords.length > 0),
      getData: () => this.currentRecipe?.keywords,
      tagClass: 'keyword-tag'
    },
    // Legacy download support sections
    {
      id: 'download-executable',
      title: 'Download Executable',
      icon: 'get_app',
      elementId: 'recipe-download-executable',
      contentType: 'component',
      componentName: 'app-recipe-download',
      isVisible: () => !!this.currentRecipe?.downloadableExecutable,
      getData: () => this.currentRecipe?.downloadableExecutable,
      isLegacy: true
    },
    {
      id: 'installation-guide',
      title: 'Installation Guide',
      icon: 'install_desktop',
      elementId: 'recipe-installation-guide',
      contentType: 'text',
      isVisible: () => !!this.currentRecipe?.downloadableExecutable,
      getData: () => 'Instructions for installing and configuring the downloaded executable.',
      isLegacy: true
    },
    {
      id: 'version-info',
      title: 'Version Information',
      icon: 'info',
      elementId: 'recipe-version-info',
      contentType: 'version-info',
      isVisible: () => !!this.currentRecipe?.downloadableExecutable,
      getData: () => this.currentRecipe?.downloadableExecutable,
      isLegacy: true
    }
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
          icon: config.icon,
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
    const legacyWalkthrough = this.currentRecipe?.legacyWalkthrough;

    // Handle new array format
    if (Array.isArray(walkthrough)) {
      walkthrough.forEach((step, index) => {
        sections.push({
          id: `step-${index}`,
          title: step.step || `Step ${index + 1}`,
          icon: 'settings',
          elementId: `recipe-step-${index}`
        });
      });
    } else if (legacyWalkthrough) {
      // Legacy format - dynamic detection of available steps
      const legacySteps = [
        { key: 'createExecutable', title: 'Create Executable', icon: 'add_circle', elementId: 'recipe-create-executable' },
        { key: 'retrieve', title: 'Retrieve Data', icon: 'download', elementId: 'recipe-retrieve-data' },
        { key: 'scoping', title: 'Scoping', icon: 'filter_list', elementId: 'recipe-scoping' },
        { key: 'match', title: 'Match', icon: 'compare_arrows', elementId: 'recipe-match' },
        { key: 'mapping', title: 'Mapping', icon: 'swap_horiz', elementId: 'recipe-mapping' },
        { key: 'action', title: 'Action', icon: 'play_arrow', elementId: 'recipe-action' },
        { key: 'verify', title: 'Verify', icon: 'check_circle', elementId: 'recipe-verify' },
        { key: 'previewTransformed', title: 'Preview Transformed', icon: 'preview', elementId: 'recipe-preview-transformed' },
        { key: 'addSchedule', title: 'Add Schedule', icon: 'schedule', elementId: 'recipe-add-schedule' }
      ];

      legacySteps.forEach(step => {
        if ((legacyWalkthrough as any)[step.key]) {
          sections.push({
            id: step.key.replace(/([A-Z])/g, '-$1').toLowerCase(),
            title: step.title,
            icon: step.icon,
            elementId: step.elementId
          });
        }
      });
    }

    return sections;
  }

  /**
   * Get paginated trending recipes
   */
  get paginatedTrendingRecipes(): RecipeItem[] {
    if (!this.showHome) return [];
    return this.trendingRecipes.slice(this.tocPagination.startIndex, this.tocPagination.endIndex);
  }

  /**
   * Get paginated category recipes
   */
  get paginatedCategoryRecipes(): RecipeItem[] {
    if (this.showHome) return [];
    return this.currentRecipes.slice(this.tocPagination.startIndex, this.tocPagination.endIndex);
  }

  /**
   * Get TOC pagination info
   */
  get tocPaginationInfo(): string {
    const start = this.tocPagination.startIndex + 1;
    const end = Math.min(this.tocPagination.endIndex, this.tocItemCount);
    return `${start}-${end} of ${this.tocItemCount}`;
  }

  /**
   * Check if has previous TOC page
   */
  get hasPreviousTOCPage(): boolean {
    return this.tocPagination.currentPage > 1;
  }

  /**
   * Check if has next TOC page
   */
  get hasNextTOCPage(): boolean {
    return this.tocPagination.currentPage < this.tocPagination.totalPages;
  }

  /**
   * Go to previous TOC page
   */
  goToPreviousTOCPage(): void {
    if (this.tocPagination.currentPage > 1) {
      this.tocPagination.currentPage--;
      this.updateTOCPaginationIndices();
      this.cdr.markForCheck();
    }
  }

  /**
   * Go to next TOC page
   */
  goToNextTOCPage(): void {
    if (this.tocPagination.currentPage < this.tocPagination.totalPages) {
      this.tocPagination.currentPage++;
      this.updateTOCPaginationIndices();
      this.cdr.markForCheck();
    }
  }

  /**
   * Update TOC pagination indices
   */
  private updateTOCPaginationIndices(): void {
    const totalItems = this.tocItemCount;
    this.tocPagination.totalPages = Math.ceil(totalItems / this.tocPagination.itemsPerPage);
    this.tocPagination.startIndex = (this.tocPagination.currentPage - 1) * this.tocPagination.itemsPerPage;
    this.tocPagination.endIndex = Math.min(
      this.tocPagination.startIndex + this.tocPagination.itemsPerPage,
      totalItems
    );
  }

  /**
   * Reset TOC pagination
   */
  private resetTOCPagination(): void {
    this.tocPagination.currentPage = 1;
    this.updateTOCPaginationIndices();
  }

  /**
   * Toggle TOC visibility
   */
  toggleTOC(): void {
    this.ui.tocHidden = !this.ui.tocHidden;
    this.saveTOCState();
    this.cdr.markForCheck();
  }

  /**
   * Toggle mobile TOC
   */
  toggleMobileTOC(): void {
    this.ui.mobileTOCOpen = !this.ui.mobileTOCOpen;
    this.cdr.markForCheck();
  }

  /**
   * Close mobile TOC
   */
  closeMobileTOC(): void {
    this.ui.mobileTOCOpen = false;
    this.cdr.markForCheck();
  }

  /**
   * Save TOC state to localStorage
   */
  private saveTOCState(): void {
    try {
      localStorage.setItem('recipe_toc_hidden', JSON.stringify(this.ui.tocHidden));
    } catch (error) {
      console.warn('Failed to save TOC state:', error);
    }
  }

  /**
   * Load TOC state from localStorage
   */
  private loadTOCState(): void {
    try {
      const saved = localStorage.getItem('recipe_toc_hidden');
      if (saved !== null) {
        this.ui.tocHidden = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load TOC state:', error);
    }
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
          this.handleOptimizedScroll(window.pageYOffset);
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
  private handleOptimizedScroll(scrollPosition: number): void {
    // Only update active section when viewing recipe details and auto-highlighting is enabled
    if (this.showRecipeDetails && this.ui.userHasScrolled && !this.ui.disableScrollHighlight) {
      this.updateActiveScrollElement(scrollPosition);
    }
  }

  /**
   * Update active section based on scroll position
   * Only tracks sections within the currently active tab to prevent unwanted tab switches
   */
  private updateActiveScrollElement(scrollPosition: number): void {
    const offset = scrollPosition + 150; // Account for header height
    
    // Only process if we have an active tab
    if (!this.ui.activeRecipeTab) return;
    
    // Cache section elements and their positions for current active tab only
    if (!this.cachedSectionElements || this.cachedSectionElements.length === 0) {
      this.refreshSectionElementsCacheForActiveTab();
    }
    
    let activeSectionId = '';
    let closestDistance = Infinity;

    // Find the section that is currently in view (only from active tab)
    this.cachedSectionPositions.forEach((position, sectionId) => {
      // Double-check that this section belongs to the active tab
      if (!this.sectionBelongsToActiveTab(sectionId)) {
        return;
      }
      
      const distance = Math.abs(position - offset);
      if (distance < closestDistance && position <= offset + 100) {
        closestDistance = distance;
        activeSectionId = sectionId;
      }
    });

    // Update active section if it has changed
    if (activeSectionId && activeSectionId !== this.ui.activeSectionId) {
      this.ui.activeSectionId = activeSectionId;
      this.recipeTOC.currentSectionId = activeSectionId;
      
      // When scrolling updates the section, clear TOC tab highlighting
      // This ensures only the section is highlighted, not the parent tab
      this.ui.highlightedTOCTab = '';
      
      // No need to call ensureParentTabActive since we're already in the correct tab
      
      this.cdr.markForCheck();
    }
  }

  /**
   * Refresh cache of section elements and their positions
   * Legacy method - now delegates to active tab specific method
   */
  private refreshSectionElementsCache(): void {
    this.refreshSectionElementsCacheForActiveTab();
  }

  /**
   * Refresh cache of section elements and their positions for active tab only
   * This prevents scroll detection from switching between tabs
   */
  private refreshSectionElementsCacheForActiveTab(): void {
    if (!this.currentRecipe || !this.ui.activeRecipeTab) return;

    this.cachedSectionElements = [];
    this.cachedSectionPositions.clear();

    // Get section elements only from the currently active tab
    const activeTab = this.recipeTOC.tabs.find(tab => tab.id === this.ui.activeRecipeTab);
    if (!activeTab) return;

    activeTab.sections.forEach(section => {
      if (section.elementId) {
        const element = document.getElementById(section.elementId);
        if (element) {
          this.cachedSectionElements!.push(element);
          const rect = element.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          this.cachedSectionPositions.set(section.id, rect.top + scrollTop);
        }
      }
    });
  }

  /**
   * Clear section elements cache (call when recipe changes)
   */
  private clearSectionElementsCache(): void {
    this.cachedSectionElements = null;
    this.cachedSectionPositions.clear();
  }

  /**
   * Check if a section belongs to the currently active tab
   */
  private sectionBelongsToActiveTab(sectionId: string): boolean {
    if (!this.ui.activeRecipeTab) return false;
    
    const activeTab = this.recipeTOC.tabs.find(tab => tab.id === this.ui.activeRecipeTab);
    if (!activeTab) return false;
    
    return activeTab.sections.some(section => section.id === sectionId);
  }

  /**
   * Get sections for currently active tab
   */
  getActiveTabSections(): RecipeSection[] {
    if (!this.ui.activeRecipeTab || !this.recipeTOC.tabs) {
      return [];
    }
    
    const activeTab = this.recipeTOC.tabs.find(tab => tab.id === this.ui.activeRecipeTab);
    return activeTab ? activeTab.sections : [];
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
  navigateToOverviewSection(sectionId: string): void {
    // Switch to overview tab if not already there
    if (this.ui.activeRecipeTab !== 'overview') {
      this.ui.activeRecipeTab = 'overview';
      this.recipeTOC.currentTabId = 'overview';
    }
    
    // Navigate to the section
    this.changeRecipeSection(sectionId);
  }

  /**
   * Navigate to Walkthrough section
   */
  navigateToWalkthroughSection(sectionId: string, stepIndex: number): void {
    // Switch to walkthrough tab if not already there
    if (this.ui.activeRecipeTab !== 'walkthrough') {
      this.ui.activeRecipeTab = 'walkthrough';
      this.recipeTOC.currentTabId = 'walkthrough';
      this.ui.currentWalkthroughStep = stepIndex;
    } else {
      // If already in walkthrough tab, just update the step
      this.ui.currentWalkthroughStep = stepIndex;
    }
    
    // Update URL with new step
    this.updateUrlParams('walkthrough', stepIndex);
    
    // Navigate to the section
    this.changeRecipeSection(sectionId);
  }

  /**
   * Handle step completion in walkthrough
   */
  onStepComplete(stepNumber: number): void {
    if (this.currentRecipe) {
      this.updateRecipeProgress(this.currentRecipe, stepNumber);
    }
  }

  // ==================== Walkthrough Step Navigation ====================

  /**
   * Get all walkthrough steps for current recipe
   */
  get walkthroughSteps(): string[] {
    if (!this.currentRecipe?.walkthrough) return [];
    
    const steps: string[] = [];
    const walkthrough = this.currentRecipe.walkthrough;
    const legacyWalkthrough = this.currentRecipe.legacyWalkthrough;
    
    // Handle both new array format and legacy object format
    if (Array.isArray(walkthrough)) {
      // New format - return step names
      return walkthrough.map((step, index) => step.step || `Step ${index + 1}`);
    } else if (legacyWalkthrough) {
      // Legacy format - check for named properties
      if (legacyWalkthrough.createExecutable) steps.push('createExecutable');
      if (legacyWalkthrough.retrieve) steps.push('retrieve');
      if (legacyWalkthrough.scoping) steps.push('scoping');
      if (legacyWalkthrough.match) steps.push('match');
      if (legacyWalkthrough.mapping) steps.push('mapping');
      if (legacyWalkthrough.action) steps.push('action');
      if (legacyWalkthrough.verify) steps.push('verify');
      if (legacyWalkthrough.previewTransformed) steps.push('previewTransformed');
      if (legacyWalkthrough.addSchedule) steps.push('addSchedule');
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
    
    // Legacy format handling
    const steps = this.walkthroughSteps;
    if (steps.length === 0 || this.ui.currentWalkthroughStep >= steps.length) return null;
    
    const stepType = steps[this.ui.currentWalkthroughStep];
    const walkthrough = this.currentRecipe?.legacyWalkthrough as any;
    return walkthrough?.[stepType] || null;
  }

  /**
   * Get current step type
   */
  get currentStepType(): string {
    if (!this.currentRecipe?.walkthrough) return '';
    
    // Handle new array format
    if (Array.isArray(this.currentRecipe.walkthrough)) {
      const steps = this.currentRecipe.walkthrough;
      if (this.ui.currentWalkthroughStep >= 0 && this.ui.currentWalkthroughStep < steps.length) {
        return 'custom'; // All new format steps use 'custom' type
      }
      return '';
    }
    
    // Legacy format handling
    const steps = this.walkthroughSteps;
    if (steps.length === 0 || this.ui.currentWalkthroughStep >= steps.length) return '';
    
    return steps[this.ui.currentWalkthroughStep];
  }

  /**
   * Get step title
   */
  getStepTitle(stepType: string): string {
    const titles: { [key: string]: string } = {
      'createExecutable': 'Create Executable',
      'retrieve': 'Retrieve Data',
      'scoping': 'Scoping',
      'match': 'Match',
      'mapping': 'Mapping',
      'action': 'Action',
      'verify': 'Verify',
      'previewTransformed': 'Preview Transformed', 
      'addSchedule': 'Add Schedule'
    };
    return titles[stepType] || stepType;
  }

  /**
   * Get walkthrough step index from section ID
   */
  private getWalkthroughStepFromSectionId(sectionId: string): number {
    // Handle new array format - section IDs are like "step-0", "step-1", etc.
    if (sectionId.startsWith('step-')) {
      const stepIndex = parseInt(sectionId.replace('step-', ''), 10);
      return isNaN(stepIndex) ? -1 : stepIndex;
    }

    // Legacy format mapping
    const sectionToStepMap: { [key: string]: string } = {
      'create-executable': 'createExecutable',
      'retrieve-data': 'retrieve',
      'scoping': 'scoping',
      'match': 'match',
      'mapping': 'mapping',
      'action': 'action',
      'verify': 'verify',
      'preview-transformed': 'previewTransformed',
      'add-schedule': 'addSchedule'
    };

    const stepType = sectionToStepMap[sectionId];
    if (!stepType) return -1;

    return this.walkthroughSteps.indexOf(stepType);
  }

  /**
   * Get section ID from walkthrough step index
   */
  private getSectionIdFromWalkthroughStep(stepIndex: number): string {
    if (!this.currentRecipe?.walkthrough) return '';

    // Handle new array format - section IDs are "step-0", "step-1", etc.
    if (Array.isArray(this.currentRecipe.walkthrough)) {
      if (stepIndex >= 0 && stepIndex < this.currentRecipe.walkthrough.length) {
        return `step-${stepIndex}`;
      }
      return '';
    }

    // Legacy format mapping
    const stepToSectionMap: { [key: string]: string } = {
      'createExecutable': 'create-executable',
      'retrieve': 'retrieve-data',
      'scoping': 'scoping',
      'match': 'match',
      'mapping': 'mapping',
      'action': 'action',
      'verify': 'verify',
      'previewTransformed': 'preview-transformed',
      'addSchedule': 'add-schedule'
    };

    const steps = this.walkthroughSteps;
    if (stepIndex < 0 || stepIndex >= steps.length) return '';

    const stepType = steps[stepIndex];
    return stepToSectionMap[stepType] || '';
  }

  /**
   * Sync TOC section with current walkthrough step
   */
  private syncTOCSectionWithWalkthrough(): void {
    if (this.ui.activeRecipeTab === 'walkthrough') {
      const sectionId = this.getSectionIdFromWalkthroughStep(this.ui.currentWalkthroughStep);
      if (sectionId) {
        console.log('Syncing TOC section with walkthrough step:', sectionId);
        this.ui.activeSectionId = sectionId;
        this.recipeTOC.currentSectionId = sectionId;
      }
    }
  }

  /**
   * Navigate to next step
   */
  goToNextWalkthroughStep(): void {
    const steps = this.walkthroughSteps;
    if (this.ui.currentWalkthroughStep < steps.length - 1) {
      this.ui.currentWalkthroughStep++;
      this.syncTOCSectionWithWalkthrough();
      this.updateUrlParams('walkthrough', this.ui.currentWalkthroughStep);
      this.cdr.markForCheck();
      this.scrollToTop();
    }
  }

  /**
   * Navigate to previous step
   */
  goToPreviousWalkthroughStep(): void {
    if (this.ui.currentWalkthroughStep > 0) {
      this.ui.currentWalkthroughStep--;
      this.syncTOCSectionWithWalkthrough();
      this.updateUrlParams('walkthrough', this.ui.currentWalkthroughStep);
      this.cdr.markForCheck();
      this.scrollToTop();
    }
  }

  /**
   * Navigate to specific step
   */
  goToWalkthroughStep(stepIndex: number): void {
    const steps = this.walkthroughSteps;
    if (stepIndex >= 0 && stepIndex < steps.length) {
      this.ui.currentWalkthroughStep = stepIndex;
      this.syncTOCSectionWithWalkthrough();
      this.updateUrlParams('walkthrough', this.ui.currentWalkthroughStep);
      this.cdr.markForCheck();
      this.scrollToTop();
    }
  }

  /**
   * Mark current step as completed
   */
  markCurrentStepComplete(): void {
    this.ui.walkthroughStepsCompleted.add(this.ui.currentWalkthroughStep);
    this.onStepComplete(this.ui.currentWalkthroughStep);
    
    // Auto advance to next step if not the last one
    if (this.ui.currentWalkthroughStep < this.walkthroughSteps.length - 1) {
      setTimeout(() => {
        this.goToNextWalkthroughStep();
      }, 500);
    }
  }

  /**
   * Check if step is completed
   */
  isStepCompleted(stepIndex: number): boolean {
    return this.ui.walkthroughStepsCompleted.has(stepIndex);
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
   * Get previous step title
   */
  get previousStepTitle(): string {
    if (!this.canGoToPreviousStep) return '上一步';
    const prevIndex = this.ui.currentWalkthroughStep - 1;
    return this.getStepTitleByIndex(prevIndex);
  }

  /**
   * Get next step title  
   */
  get nextStepTitle(): string {
    if (!this.canGoToNextStep) return '下一步';
    const nextIndex = this.ui.currentWalkthroughStep + 1;
    return this.getStepTitleByIndex(nextIndex);
  }

  /**
   * Get step title by index
   */
  private getStepTitleByIndex(index: number): string {
    // Handle new array format
    if (Array.isArray(this.currentRecipe?.walkthrough)) {
      const step = this.currentRecipe?.walkthrough[index];
      return step?.step || `Step ${index + 1}`;
    }
    
    // Handle legacy format
    const steps = this.walkthroughSteps;
    if (index >= 0 && index < steps.length) {
      return this.getStepTitle(steps[index]);
    }
    
    return `Step ${index + 1}`;
  }

  /**
   * Get progress percentage
   */
  get walkthroughProgress(): number {
    const steps = this.walkthroughSteps;
    if (steps.length === 0) return 0;
    return ((this.ui.currentWalkthroughStep + 1) / steps.length) * 100;
  }

  /**
   * Reset walkthrough to first step
   */
  resetWalkthrough(): void {
    this.ui.currentWalkthroughStep = 0;
    this.ui.walkthroughStepsCompleted.clear();
    this.cdr.markForCheck();
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

  // ==================== Compatibility Helper Methods ====================

  /**
   * Check if prerequisites is an array (for template use)
   */
  isArrayPrerequisites(prerequisites: any): boolean {
    return Array.isArray(prerequisites);
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
   * Get permission sets for building (supports both new and legacy formats)
   */
  getPermissionSetsForBuilding(): string[] {
    if (!this.currentRecipe) return [];
    
    // Check if recipe has legacy prerequisites structure
    const legacyPrereqs = this.currentRecipe.prerequisites as any;
    if (legacyPrereqs?.permissionSetsForBuilding) {
      return legacyPrereqs.permissionSetsForBuilding;
    }
    
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
   * Get permission sets for using (supports both new and legacy formats)
   */
  getPermissionSetsForUsing(): string[] {
    if (!this.currentRecipe) return [];
    
    // Check if recipe has legacy prerequisites structure
    const legacyPrereqs = this.currentRecipe.prerequisites as any;
    if (legacyPrereqs?.permissionSetsForUsing) {
      return legacyPrereqs.permissionSetsForUsing;
    }
    
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
   * Get safe directions (supports both new and legacy formats)
   */
  getSafeDirections(): any {
    if (!this.currentRecipe) return '';
    
    // Check if recipe has legacy prerequisites structure
    const legacyPrereqs = this.currentRecipe.prerequisites as any;
    if (legacyPrereqs?.safeDirections) {
      return legacyPrereqs.safeDirections;
    }
    
    // New format - return direction
    return this.currentRecipe.safeDirection || this.currentRecipe.direction || '';
  }

  /**
   * Check if current recipe has valid use case
   */
  hasValidUseCase(): boolean {
    const usecase = this.currentRecipe?.usecase || this.currentRecipe?.useCase;
    return !!(usecase && usecase.trim().length > 0);
  }

  /**
   * Check if current recipe has valid connection
   */
  hasValidConnection(): boolean {
    const connection = this.currentRecipe?.connection;
    return !!(connection && connection.trim().length > 0);
  }

  /**
   * Check if current recipe has valid direction
   */
  hasValidDirection(): boolean {
    const direction = this.currentRecipe?.direction;
    return !!(direction && direction.trim().length > 0);
  }

  /**
   * Check if current recipe has valid downloadable executables
   */
  hasValidDownloadableExecutables(): boolean {
    const executables = this.currentRecipe?.downloadableExecutables;
    return !!(executables && executables.length > 0 && 
              executables.some(exe => exe.title && exe.title.trim().length > 0 && 
                                     exe.url && exe.url.trim().length > 0));
  }

  /**
   * Get valid downloadable executables (with non-empty title and url)
   */
  getValidDownloadableExecutables() {
    const executables = this.currentRecipe?.downloadableExecutables || [];
    return executables.filter(exe => exe.title && exe.title.trim().length > 0 && 
                                    exe.url && exe.url.trim().length > 0);
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