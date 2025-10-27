import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewEncapsulation,
  HostListener
} from '@angular/core';
// Removed Angular animations to prevent conflicts with CSS animations
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
  RecipeSearchResult
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
  mobileTOCOpen: boolean;
  isMobile: boolean;
  currentView: 'home' | 'category' | 'recipe';
  isPreviewMode: boolean;
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
  // Scroll-to-next-step control
  isTransitioningStep: boolean;
  lastStepTransitionTime: number;
  // Two-scroll logic for bottom navigation
  hasScrolledToBottomOnce: boolean;
  hasScrolledToTopOnce: boolean;
  // Scroll hint display
  showScrollHint: boolean;
  scrollHintDirection: 'top' | 'bottom' | null;
  scrollHintOpacity: number;
  // Animation control
  stepAnimationDirection: 'forward' | 'backward' | null;
  tabAnimationDirection: 'forward' | 'backward' | null;
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
  focused: boolean;
  isActive: boolean;
  results: SearchResult[];
  hasResults: boolean;
  suggestions: string[];
  showSuggestions: boolean;
  selectedIndex: number;
  isOpen: boolean;
  isOverlayOpen: boolean;
}

@Component({
  selector: 'app-recipes',
  templateUrl: './recipes.component.html',
  styleUrls: ['./recipes.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
  // Removed animations array to prevent conflicts with CSS animations
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
    isPreviewMode: false,
    tocHidden: true,
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
    walkthroughStepsCompleted: new Set<number>(),
    // Scroll-to-next-step control
    isTransitioningStep: false,
    lastStepTransitionTime: 0,
    // Two-scroll logic for bottom navigation
    hasScrolledToBottomOnce: false,
    hasScrolledToTopOnce: false,
    // Scroll hint display
    showScrollHint: false,
    scrollHintDirection: null,
    scrollHintOpacity: 0,
    // Animation control
    stepAnimationDirection: null,
    tabAnimationDirection: null
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
    focused: false,
    isActive: false,
    results: [],
    hasResults: true,
    suggestions: [],
    showSuggestions: false,
    selectedIndex: -1,
    isOpen: false,
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

  /**
   * Handle wheel scroll events for walkthrough auto-navigation
   */
  @HostListener('window:wheel', ['$event'])
  onWheelScroll(event: WheelEvent) {
    // Only handle when viewing recipe details
    if (!this.showRecipeDetails) {
      return;
    }

    // Handle Overview to Walkthrough transition
    if (this.ui.activeRecipeTab === 'overview') {
      // Prevent transitions if already transitioning
      if (this.ui.isTransitioningStep) {
        return;
      }

      // Check cooldown period (800ms between transitions)
      const now = Date.now();
      if (now - this.ui.lastStepTransitionTime < 800) {
        return;
      }

      // If scrolling down at bottom of Overview, implement two-scroll logic
      if (event.deltaY > 0 && this.isAtPageBottom()) {
        if (!this.ui.hasScrolledToBottomOnce) {
          // First time reaching bottom - just mark it and don't transition
          this.ui.hasScrolledToBottomOnce = true;
          this.cdr.markForCheck();
        } else {
          // Second scroll action while at bottom - perform transition
          this.ui.isTransitioningStep = true;
          this.ui.lastStepTransitionTime = now;
          
          // Reset scroll tracking state
          this.ui.hasScrolledToBottomOnce = false;
          
          // Switch to Walkthrough tab at first step with animation
          this.ui.currentWalkthroughStep = 0;
          this.changeRecipeTab('walkthrough', true); // Enable animation
          
          // Scroll to first step section instead of top
          setTimeout(() => {
            const firstStepSectionId = this.getSectionIdFromWalkthroughStep(0);
            if (firstStepSectionId) {
              this.scrollToSection(firstStepSectionId);
            } else {
              // Fallback to top if section not found
              this.scrollToTop();
            }
          }, 100); // Small delay to let animation start
          
          // Reset transition flag after animation completes
          setTimeout(() => {
            this.ui.isTransitioningStep = false;
          }, 1000); // After animation (0.9s) + buffer
        }
      }
      return;
    }

    // Only handle in walkthrough tab from here
    if (this.ui.activeRecipeTab !== 'walkthrough') {
      return;
    }

    // Prevent transitions if already transitioning
    if (this.ui.isTransitioningStep) {
      return;
    }

    // Check cooldown period (800ms between transitions)
    const now = Date.now();
    if (now - this.ui.lastStepTransitionTime < 800) {
      return;
    }

    // If in walkthrough first step and scrolling up at top, switch to overview
    if (event.deltaY < 0 && this.isAtPageTop() && 
        this.ui.currentWalkthroughStep === 0 && 
        this.ui.activeRecipeTab === 'walkthrough') {
      
      this.ui.isTransitioningStep = true;
      this.ui.lastStepTransitionTime = now;
      
      // Hide hint before transitioning
      this.ui.showScrollHint = false;
      
      // Switch to Overview tab with animation
      this.changeRecipeTab('overview', true); // Enable animation
      
      // Scroll to top of overview for intuitive navigation
      setTimeout(() => {
        this.scrollToTop();
      }, 100); // Small delay to let animation start
      
      // Reset transition flag after animation completes
      setTimeout(() => {
        this.ui.isTransitioningStep = false;
        // Update scroll hint based on new state
        this.updateScrollHint();
      }, 1000); // After animation (0.9s) + buffer
      
      return; // Prevent further processing
    }

    // Check if scrolling down and at bottom - implement two-scroll logic
    if (event.deltaY > 0 && this.isAtPageBottom() && this.canGoToNextStep) {
      if (!this.ui.hasScrolledToBottomOnce) {
        // First time reaching bottom - just mark it and don't transition
        this.ui.hasScrolledToBottomOnce = true;
        this.cdr.markForCheck();
      } else {
        // Second scroll action while at bottom - perform transition
        this.ui.isTransitioningStep = true;
        this.ui.lastStepTransitionTime = now;
        
        // Reset scroll tracking state
        this.ui.hasScrolledToBottomOnce = false;
        
        // Hide hint before transitioning
        this.ui.showScrollHint = false;
        
        // Navigate to next step
        this.goToNextWalkthroughStep();
        
        // Reset transition flag after animation - extended time to prevent hint from reappearing
        setTimeout(() => {
          this.ui.isTransitioningStep = false;
        }, 1500);
      }
    }
    // Check if scrolling up and at top - implement two-scroll logic  
    else if (event.deltaY < 0 && this.isAtPageTop() && this.canGoToPreviousStep) {
      if (!this.ui.hasScrolledToTopOnce) {
        // First time reaching top - just mark it and don't transition
        this.ui.hasScrolledToTopOnce = true;
        this.cdr.markForCheck();
      } else {
        // Second scroll action while at top - perform transition
        this.ui.isTransitioningStep = true;
        this.ui.lastStepTransitionTime = now;
        
        // Reset scroll tracking state
        this.ui.hasScrolledToTopOnce = false;
        
        // Hide hint before transitioning
        this.ui.showScrollHint = false;
        
        // Navigate to previous step
        this.goToPreviousWalkthroughStep();
        
        // Reset transition flag after animation - extended time to prevent hint from reappearing
        setTimeout(() => {
          this.ui.isTransitioningStep = false;
        }, 1500);
      }
    }
  }

  /**
   * Update scroll hint based on scroll position - Unified logic for both tabs
   */
  private updateScrollHint(): void {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
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

  /**
   * Check if user has scrolled to the bottom of the page
   */
  private isAtPageBottom(): boolean {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Allow 50px tolerance for "bottom"
    const tolerance = 50;
    return (scrollTop + windowHeight) >= (documentHeight - tolerance);
  }

  /**
   * Check if user is at the top of the page
   */
  private isAtPageTop(): boolean {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    // Consider "at top" if scroll is less than 50px
    return scrollTop < 50;
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
      // Primary sort: by category
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) {
        return categoryCompare;
      }
      // Secondary sort: by title A-Z within same category
      return a.title.localeCompare(b.title);
    });
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
          this.filteredRecipes = this.sortRecipesByCategoryAndTitle(recipes);
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
      
      //console.log('📖 Loaded recipe preview data for:', recipeId);
      this.cdr.markForCheck();
    } else {
      console.warn('⚠️ No preview data found for recipe:', recipeId);
      this.updateUIState({ isLoading: false });
    }
  }

  /**
   * Setup preview synchronization for cross-tab updates
   */
  private setupPreviewSync(recipeId: string): void {
    //console.log('🎧 Setting up recipe preview update listeners for Recipe ID:', recipeId);
    
    // Enhanced storage event listener
    const handleStorageChange = (event: StorageEvent) => {
      const sessionKey = `recipe-preview-${recipeId}`;
      const backupKey = `backup-recipe-preview-${recipeId}`;
      

      
      // Check both sessionStorage and localStorage keys
      if ((event.key === sessionKey || event.key === backupKey) && event.newValue) {
        try {
          const previewData = JSON.parse(event.newValue) as RecipePreviewData;
          //console.log('🔄 Updating recipe preview content from storage event');
          
          this.updatePreviewContent(previewData);
        } catch (error) {
          console.error('❌ Error parsing recipe preview update data:', error);
        }
      }
    };

    // Listen for storage changes (cross-tab communication)
    window.addEventListener('storage', handleStorageChange);
    //console.log('✅ Storage event listener added for recipe preview');
    
    // Enhanced periodic check for updates (fallback mechanism)
    const updateInterval = setInterval(() => {
      //console.log('⏰ Periodic check for recipe preview updates...');
      this.checkForPreviewUpdates(recipeId);
    }, 1000); // Check every 1 second for better responsiveness
    
    // Cleanup on destroy
    this.destroy$.subscribe(() => {
      //console.log('🧹 Cleaning up recipe preview update listeners');
      clearInterval(updateInterval);
      window.removeEventListener('storage', handleStorageChange);
    });
  }

  /**
   * Update preview content with new data
   */
  private updatePreviewContent(previewData: RecipePreviewData): void {
    if (!this.currentRecipe) return;

    //console.log('🖼️ Updating recipe preview UI with new content');
    
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
    
    //console.log('✅ Recipe preview UI updated successfully');
  }

  /**
   * Check for preview updates via periodic polling (fallback mechanism)
   */
  private checkForPreviewUpdates(recipeId: string): void {
    const currentData = this.previewService.getPreviewData(recipeId);
    if (!currentData || !this.currentRecipe) return;

    const currentTimestamp = this.getPreviewTimestamp();
    
    if (currentData.timestamp > currentTimestamp) {
      //console.log('📅 Found newer recipe content via periodic check, updating...');
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
    //console.log('Navigating to recipe:', recipe.title, '(id:', recipe.id, ') Category:', recipe.category);
    
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
      
      // Reset scroll tracking states when navigating to different recipe
      this.ui.hasScrolledToBottomOnce = false;
      this.ui.hasScrolledToTopOnce = false;
    }
    
    if (this.ui.isMobile) {
      this.closeMobileSidebar();
    }
  }

  /**
   * Change recipe tab - Optimized for smooth animation without conflicts
   */
  changeRecipeTab(tabName: string, withAnimation: boolean = false): void {
    //console.log('Changing recipe tab to:', tabName);
    
    // Clear previous animation state at the start
    this.ui.tabAnimationDirection = null;
    
    // Determine animation direction if animation is requested
    if (withAnimation) {
      const currentTab = this.ui.activeRecipeTab;
      if (currentTab === 'overview' && tabName === 'walkthrough') {
        this.ui.tabAnimationDirection = 'forward';
      } else if (currentTab === 'walkthrough' && tabName === 'overview') {
        this.ui.tabAnimationDirection = 'backward';
      }
    }
    
    // Set active tab for content display
    this.ui.activeRecipeTab = tabName;
    this.recipeTOC.currentTabId = tabName;
    
    // Clear active section when clicking on tab directly
    this.ui.activeSectionId = '';
    this.recipeTOC.currentSectionId = '';
    
    // Reset scroll tracking states when switching tabs
    this.ui.hasScrolledToBottomOnce = false;
    this.ui.hasScrolledToTopOnce = false;
    
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
    
    // Use requestAnimationFrame to avoid interrupting animations
    if (withAnimation) {
      requestAnimationFrame(() => {
        this.cdr.markForCheck();
      });
    } else {
      this.cdr.markForCheck();
    }
    
    // Refresh cache after UI updates for the new active tab
    setTimeout(() => {
      this.refreshSectionElementsCacheForActiveTab();
    }, 100);
  }

  /**
   * Change recipe section
   */
  changeRecipeSection(sectionId: string): void {
    //console.log('Changing recipe section to:', sectionId);
    
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
        //console.log('Navigating to walkthrough step:', stepIndex);
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
      //console.log('Ensuring parent tab is active for content display and expanded for section:', sectionId);
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
   * Enhanced intelligent section scrolling with multiple strategies
   */
  private scrollToSection(sectionId: string): void {
    // Add small delay to ensure DOM is ready
    setTimeout(() => {
      const section = this.recipeTOC.tabs
        .flatMap(tab => tab.sections)
        .find(s => s.id === sectionId);

      let targetElement: HTMLElement | null = null;

      // Strategy 1: Find by section's elementId
      if (section?.elementId) {
        targetElement = document.getElementById(section.elementId);
      }

      // Strategy 2: Try to find by sectionId directly
      if (!targetElement) {
        targetElement = document.getElementById(sectionId);
      }

      // Strategy 3: Find by data attribute
      if (!targetElement) {
        const dataElement = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (dataElement) {
          targetElement = dataElement as HTMLElement;
        }
      }

      // Strategy 4: Find by class name pattern
      if (!targetElement) {
        const classElement = document.querySelector(`.recipe-${sectionId}, .${sectionId}-section`);
        if (classElement) {
          targetElement = classElement as HTMLElement;
        }
      }

      if (targetElement) {
        // Calculate optimal scroll position with header offset
        const headerOffset = 80; // Account for fixed header
        const elementRect = targetElement.getBoundingClientRect();
        const elementPosition = elementRect.top + window.pageYOffset;
        const optimalScrollPosition = Math.max(0, elementPosition - headerOffset);

        // Smooth scroll to the target
        window.scrollTo({
          top: optimalScrollPosition,
          behavior: 'smooth'
        });

        // Add visual feedback to show scroll target
        this.addScrollVisualFeedback(targetElement);

      } else {
        // Fallback 1: Try to scroll to tab content area
        const activeTabContent = document.querySelector(`[data-tab="${this.ui.activeRecipeTab}"]`);
        if (activeTabContent) {
          (activeTabContent as HTMLElement).scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        } else {
          // Fallback 2: Scroll to top if no target found
          this.scrollToTop();
        }
      }
    }, 100); // Small delay to ensure DOM updates are complete
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
      pageDescription = this.currentRecipe.overview || this.currentRecipe.description || this.currentRecipe.usecase || 'Recipe for Data Sync Pro';
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
  handleSearchOverlaySelect(selectedRecipe: SelectedSuggestion): void {
    // Navigate to the selected recipe
    this.router.navigate(['/recipes', selectedRecipe.category, selectedRecipe.id]);
    
    // Track search usage
    this.recipeService.trackRecipeEvent({
      type: 'search',
      recipeId: selectedRecipe.id,
      recipeTitle: selectedRecipe.question,
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
      // Sort by category first, then by title A-Z
      this._cachedTrendingRecipes = this.sortRecipesByCategoryAndTitle(this.recipes)
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
      id: 'overview',
      title: 'Overview',
      icon: 'lightbulb',
      elementId: 'recipe-overview',
      contentType: 'use-case-highlight',
      isVisible: () => this.hasValidOverview(),
      getData: () => this.currentRecipe?.overview,
      alwaysShow: true,
      isHighlight: true
    },
    {
      id: 'when-to-use',
      title: 'General Use Case',
      icon: 'schedule',
      elementId: 'recipe-when-to-use',
      contentType: 'html',
      isVisible: () => this.hasValidWhenToUse(),
      getData: () => this.currentRecipe?.whenToUse
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
    // {
    //   id: 'connection',
    //   title: 'Connection Type',
    //   icon: 'link',
    //   elementId: 'recipe-connection',
    //   contentType: 'text',
    //   isVisible: () => this.hasValidConnection(),
    //   getData: () => this.currentRecipe?.connection
    // },
    // {
    //   id: 'direction',
    //   title: 'Direction',
    //   icon: 'trending_flat',
    //   elementId: 'recipe-direction',
    //   contentType: 'html',
    //   isVisible: () => this.hasValidDirection(),
    //   getData: () => this.currentRecipe?.safeDirection || this.currentRecipe?.direction
    // },
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
    // Reset scroll tracking states when user leaves bottom/top areas
    if (this.showRecipeDetails) {
      this.resetScrollTrackingIfNeeded();
    }
    
    // Only update active section when viewing recipe details and auto-highlighting is enabled
    if (this.showRecipeDetails && this.ui.userHasScrolled && !this.ui.disableScrollHighlight) {
      this.updateActiveScrollElement(scrollPosition);
    }
    
    // Update scroll hint for all scroll events (not just wheel events)
    if (this.showRecipeDetails) {
      this.updateScrollHint();
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
   * Get current step type
   */
  get currentStepType(): string {
    if (!this.currentRecipe?.walkthrough) return '';
    
    const steps = this.currentRecipe.walkthrough;
    if (this.ui.currentWalkthroughStep >= 0 && this.ui.currentWalkthroughStep < steps.length) {
      return 'custom'; // All new format steps use 'custom' type
    }
    return '';
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

    const stepIndex = parseInt(sectionId.replace('step-', ''), 10);
    return isNaN(stepIndex) ? -1 : stepIndex;
    


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
        //console.log('Syncing TOC section with walkthrough step:', sectionId);
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
      
      // Scroll to the specific step section instead of top
      const sectionId = this.getSectionIdFromWalkthroughStep(this.ui.currentWalkthroughStep);
      if (sectionId) {
        this.scrollToSection(sectionId);
      } else {
        // Fallback to top if section not found
        this.scrollToTop();
      }
      
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
      
      // Scroll to the specific step section instead of top
      const sectionId = this.getSectionIdFromWalkthroughStep(this.ui.currentWalkthroughStep);
      if (sectionId) {
        this.scrollToSection(sectionId);
      } else {
        // Fallback to top if section not found
        this.scrollToTop();
      }
      
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
        this.changeRecipeTab('walkthrough', true); // Enable animation
        
        // Scroll to first step section
        setTimeout(() => {
          const firstStepSectionId = this.getSectionIdFromWalkthroughStep(0);
          if (firstStepSectionId) {
            this.scrollToSection(firstStepSectionId);
          } else {
            this.scrollToTop();
          }
          
          // Re-evaluate scroll hints after tab switch and scroll complete
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
          this.changeRecipeTab('overview', true); // Enable animation
          
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
      
      // Scroll to the specific step section instead of top
      const sectionId = this.getSectionIdFromWalkthroughStep(this.ui.currentWalkthroughStep);
      if (sectionId) {
        this.scrollToSection(sectionId);
      } else {
        // Fallback to top if section not found
        this.scrollToTop();
      }
      
      // Reset animation direction after animation completes
      setTimeout(() => {
        this.ui.stepAnimationDirection = null;
        this.cdr.markForCheck();
      }, 950); // Slightly after animation ends
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

  /**
   * Add visual feedback to indicate successful scroll target
   */
  private addScrollVisualFeedback(element: HTMLElement): void {
    // Add a brief highlight effect to show the user which section was targeted
    const originalBoxShadow = element.style.boxShadow;
    const originalTransition = element.style.transition;
    
    element.style.transition = 'box-shadow 0.3s ease';
    element.style.boxShadow = '0 0 0 3px rgba(26, 115, 232, 0.3)';
    
    // Remove the highlight after a short duration
    setTimeout(() => {
      element.style.boxShadow = originalBoxShadow;
      // Remove transition after effect is complete
      setTimeout(() => {
        element.style.transition = originalTransition;
      }, 300);
    }, 1000);
  }

  /**
   * Reset scroll tracking states if user has moved away from bottom/top areas
   */
  private resetScrollTrackingIfNeeded(): void {
    const isAtBottom = this.isAtPageBottom();
    const isAtTop = this.isAtPageTop();
    
    // Reset bottom tracking if user is no longer at bottom
    if (!isAtBottom && this.ui.hasScrolledToBottomOnce) {
      this.ui.hasScrolledToBottomOnce = false;
    }
    
    // Reset top tracking if user is no longer at top  
    if (!isAtTop && this.ui.hasScrolledToTopOnce) {
      this.ui.hasScrolledToTopOnce = false;
    }
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
   * Get safe directions
   */
  getSafeDirections(): any {
    if (!this.currentRecipe) return '';
    

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
    
    //console.log('Original URL:', url);
    //console.log('Normalized URL:', normalizedUrl);
    //console.log('Download title:', title);
    
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