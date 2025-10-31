import { Injectable, OnDestroy } from '@angular/core';
import { Router, ParamMap } from '@angular/router';
import { Observable, Subject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RecipeItem, RecipeTOCStructure } from '../../core/models/recipe.model';
import { RecipeService } from '../../core/services/recipe.service';
import { RecipeUiStateService } from './ui-state.service';
import { RecipePreviewSyncService } from './preview-sync.service';
import { RecipeTocService } from './toc.service';
import { RecipePreviewService } from '../../core/services/preview.service';
import { RECIPE_MESSAGES } from '../../core/constants/recipe.constants';

/**
 * Route change event emitted when route parameters change
 */
export interface RouteChangeEvent {
  category: string;
  recipeName: string;
  isPreview: boolean;
  previewRecipeId?: string;
}

/**
 * Recipe data load result
 */
export interface RecipeLoadResult {
  currentRecipe: RecipeItem | null;
  recipeTOC: RecipeTOCStructure;
  recipes: RecipeItem[];
  filteredRecipes: RecipeItem[];
  needsObserverSetup: boolean;
  totalRecipeCount: number;  // Total count of all recipes across all views
}

/**
 * Service responsible for handling recipe routing and data loading coordination
 *
 * This service handles:
 * - Route parameter monitoring and processing
 * - View determination based on route
 * - Data loading coordination (delegates to RecipeService)
 * - Navigation methods
 * - Preview mode handling
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeRouteHandlerService implements OnDestroy {

  private destroy$ = new Subject<void>();
  private routeChange$ = new Subject<RouteChangeEvent>();
  private dataLoaded$ = new ReplaySubject<RecipeLoadResult>(1);
  private cachedTotalCount: number = 0;  // Cached total recipe count

  constructor(
    private router: Router,
    private recipeService: RecipeService,
    private uiStateService: RecipeUiStateService,
    private previewSyncService: RecipePreviewSyncService,
    private recipeTocService: RecipeTocService,
    private previewService: RecipePreviewService
  ) {
    // Initialize total count cache
    this.initializeTotalCount();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get route change events as observable
   */
  getRouteChangeEvents(): Observable<RouteChangeEvent> {
    return this.routeChange$.asObservable();
  }

  /**
   * Get data loaded events as observable
   */
  getDataLoadedEvents(): Observable<RecipeLoadResult> {
    return this.dataLoaded$.asObservable();
  }

  /**
   * Handle route parameters and determine what to load
   * Called by component when route changes
   */
  handleRouteParams(params: ParamMap, queryParams: ParamMap): void {
    // Extract route parameters
    const category = params.get('category') || '';
    const recipeName = params.get('recipeName') || '';

    // Check for preview mode from query params
    const isPreview = queryParams.get('preview') === 'true';
    const previewRecipeId = queryParams.get('recipeId') || undefined;

    // Emit route change event
    this.routeChange$.next({
      category,
      recipeName,
      isPreview,
      previewRecipeId
    });

    if (isPreview && previewRecipeId) {
      // Preview mode
      this.uiStateService.setPreviewMode(true);
      this.uiStateService.setCurrentView('recipe');
      this.loadPreviewRecipe(previewRecipeId);
      this.previewSyncService.setupPreviewSync(previewRecipeId);
    } else {
      // Normal mode - determine view based on route parameters
      this.uiStateService.setPreviewMode(false);

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
  }

  /**
   * Load all recipes for home view
   */
  private loadAllRecipes(): void {
    this.loadWithErrorHandling(
      this.recipeService.getRecipes(),
      (recipes) => {
        // Cache total count for use in other views
        this.cachedTotalCount = recipes.length;

        const sortedRecipes = this.recipeService.sortRecipesByCategoryAndTitle(recipes);

        this.dataLoaded$.next({
          currentRecipe: null,
          recipeTOC: { tabs: [] },
          recipes: recipes,
          filteredRecipes: sortedRecipes,
          needsObserverSetup: false,
          totalRecipeCount: recipes.length
        });
      },
      RECIPE_MESSAGES.ERROR_LOAD_RECIPES
    );
  }

  /**
   * Load recipes for specific category
   */
  private loadCategoryRecipes(category: string): void {
    this.loadWithErrorHandling(
      this.recipeService.getRecipesByCategory(category),
      (recipes) => {
        const sortedRecipes = this.recipeService.sortRecipesByCategoryAndTitle(recipes);

        this.dataLoaded$.next({
          currentRecipe: null,
          recipeTOC: { tabs: [] },
          recipes: recipes,
          filteredRecipes: sortedRecipes,
          needsObserverSetup: false,
          totalRecipeCount: this.cachedTotalCount  // Use cached total count
        });
      },
      RECIPE_MESSAGES.ERROR_LOAD_RECIPES
    );
  }

  /**
   * Load specific recipe details by slug
   */
  private loadRecipeDetails(category: string, recipeSlug: string): void {
    this.loadWithErrorHandling(
      this.recipeService.getRecipe(category, recipeSlug),
      (recipe) => {
        if (recipe) {
          // Generate TOC structure for the loaded recipe
          this.recipeTocService.setCurrentRecipe(recipe);
          const recipeTOC = this.recipeTocService.generateRecipeTOCStructure();

          // Reset scroll state
          this.uiStateService.resetScrollState();

          this.dataLoaded$.next({
            currentRecipe: recipe,
            recipeTOC: recipeTOC,
            recipes: [],
            filteredRecipes: [],
            needsObserverSetup: true,
            totalRecipeCount: this.cachedTotalCount  // Use cached total count
          });
        } else {
          this.dataLoaded$.next({
            currentRecipe: null,
            recipeTOC: { tabs: [] },
            recipes: [],
            filteredRecipes: [],
            needsObserverSetup: false,
            totalRecipeCount: this.cachedTotalCount  // Use cached total count
          });
        }
      },
      RECIPE_MESSAGES.ERROR_LOAD_RECIPE
    );
  }

  /**
   * Load recipe from preview data
   */
  private loadPreviewRecipe(recipeId: string): void {
    this.uiStateService.setLoading(true);

    const previewData = this.previewService.getPreviewData(recipeId);

    if (previewData) {
      // Convert preview data to RecipeItem format using service
      const currentRecipe = this.previewSyncService.convertPreviewToRecipeItem(previewData);
      this.uiStateService.setLoading(false);

      if (currentRecipe) {
        this.recipeTocService.setCurrentRecipe(currentRecipe);
        const recipeTOC = this.recipeTocService.generateRecipeTOCStructure();
        this.uiStateService.resetScrollState();

        // Set initial timestamp in preview sync service
        this.previewSyncService.setCurrentTimestamp(previewData.timestamp);

        this.dataLoaded$.next({
          currentRecipe: currentRecipe,
          recipeTOC: recipeTOC,
          recipes: [],
          filteredRecipes: [],
          needsObserverSetup: true,
          totalRecipeCount: this.cachedTotalCount  // Use cached total count
        });
      } else {
        this.dataLoaded$.next({
          currentRecipe: null,
          recipeTOC: { tabs: [] },
          recipes: [],
          filteredRecipes: [],
          needsObserverSetup: false,
          totalRecipeCount: this.cachedTotalCount  // Use cached total count
        });
      }
    } else {
      this.uiStateService.setLoading(false);
      this.dataLoaded$.next({
        currentRecipe: null,
        recipeTOC: { tabs: [] },
        recipes: [],
        filteredRecipes: [],
        needsObserverSetup: false,
        totalRecipeCount: this.cachedTotalCount  // Use cached total count
      });
    }
  }

  /**
   * Initialize total recipe count cache
   * Called on service initialization to ensure count is available for all views
   */
  private initializeTotalCount(): void {
    this.recipeService.getRecipes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recipes) => {
        this.cachedTotalCount = recipes.length;
      },
      error: (error) => {
        console.error('Error initializing total recipe count:', error);
        this.cachedTotalCount = 0;
      }
    });
  }

  // ==================== Helper Methods ====================

  /**
   * Generic loading wrapper to reduce code duplication
   * Handles loading state and error handling consistently
   */
  private loadWithErrorHandling<T>(
    observable$: Observable<T>,
    processFn: (data: T) => void,
    errorMessage: string
  ): void {
    this.uiStateService.setLoading(true);

    observable$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        processFn(data);
        this.uiStateService.setLoading(false);
      },
      error: (error) => this.handleLoadError(error, errorMessage)
    });
  }

  private handleLoadError(error: any, message: string): void {
    console.error(message, error);
    this.uiStateService.setLoading(false);
  }

  // ==================== Navigation Methods ====================

  /**
   * Navigate to home
   */
  goHome(): void {
    this.router.navigate(['/recipes']);
  }

  /**
   * Navigate to category
   */
  goToCategory(categoryName: string, closeMobileSidebar = false): void {
    this.router.navigate(['/recipes', categoryName]);

    if (closeMobileSidebar && this.uiStateService.isMobile()) {
      this.uiStateService.closeMobileSidebar();
    }
  }

  /**
   * Navigate to recipe
   * @param recipe - Recipe to navigate to
   * @param currentRecipeId - Current recipe ID to check if navigating to same recipe
   * @param currentRecipeCategory - Current recipe category to check if navigating to same recipe
   */
  goToRecipe(
    recipe: RecipeItem,
    currentRecipeId?: string,
    currentRecipeCategory?: string
  ): void {
    // Check if navigating to the same recipe
    const isSameRecipe = currentRecipeId &&
                        currentRecipeCategory &&
                        currentRecipeId === recipe.id &&
                        currentRecipeCategory === recipe.category;

    this.router.navigate(['/recipes', recipe.category, recipe.slug]);

    // Reset to top section when navigating to a different recipe
    if (!isSameRecipe) {
      this.uiStateService.setActiveSectionId('recipe-overview');
    }
  }
}
