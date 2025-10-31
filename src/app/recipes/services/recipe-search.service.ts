import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RecipeItem, RecipeFilter, RecipeSearchState } from '../../shared/models/recipe.model';
import { RecipeService } from './recipe.service';
import { SelectedSuggestion } from '../recipe-search-overlay/recipe-search-overlay.component';

/**
 * Search result event emitted when search results are updated
 */
export interface SearchResultEvent {
  query: string;
  results: RecipeItem[];
  hasResults: boolean;
}

/**
 * Service responsible for managing recipe search functionality
 *
 * This service handles:
 * - Search state management
 * - Search execution (delegates to RecipeService)
 * - Search overlay visibility
 * - Search result navigation
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeSearchService implements OnDestroy {

  private destroy$ = new Subject<void>();

  // Search state
  private searchState$ = new BehaviorSubject<RecipeSearchState>({
    query: '',
    isActive: false,
    results: [],
    hasResults: true,
    isOverlayOpen: false
  });

  // Search overlay initial query
  private searchOverlayInitialQuery$ = new BehaviorSubject<string>('');

  // Search result events
  private searchResult$ = new Subject<SearchResultEvent>();

  constructor(
    private recipeService: RecipeService,
    private router: Router
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Update search state with partial updates
   * Helper method to avoid repeating isOverlayOpen preservation logic
   */
  private updateSearchState(updates: Partial<RecipeSearchState>): void {
    const currentState = this.searchState$.value;
    this.searchState$.next({
      ...currentState,
      ...updates
    });
  }

  /**
   * Get search state as observable
   */
  getSearchState(): Observable<RecipeSearchState> {
    return this.searchState$.asObservable();
  }

  /**
   * Get current search state value
   */
  getCurrentSearchState(): RecipeSearchState {
    return this.searchState$.value;
  }

  /**
   * Get search overlay initial query
   */
  getSearchOverlayInitialQuery(): Observable<string> {
    return this.searchOverlayInitialQuery$.asObservable();
  }

  /**
   * Get search result events
   */
  getSearchResultEvents(): Observable<SearchResultEvent> {
    return this.searchResult$.asObservable();
  }

  /**
   * Search recipes
   */
  searchRecipes(query: string, currentFilter: RecipeFilter, allRecipes: RecipeItem[]): void {
    if (query.trim().length > 0) {
      this.recipeService.searchRecipes(query, currentFilter).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (results) => {
          // Update search state
          this.updateSearchState({
            query: query,
            isActive: true,
            results: results,
            hasResults: results.length > 0
          });

          // Emit search result event
          this.searchResult$.next({
            query: query,
            results: results,
            hasResults: results.length > 0
          });
        },
        error: (error) => {
          console.error('Search failed:', error);

          // Update state with error
          this.updateSearchState({
            query: query,
            isActive: true,
            results: [],
            hasResults: false
          });
        }
      });
    } else {
      // Clear search
      this.updateSearchState({
        query: '',
        isActive: false,
        results: [],
        hasResults: true
      });

      // Emit search result event with all recipes
      this.searchResult$.next({
        query: '',
        results: allRecipes,
        hasResults: true
      });
    }
  }

  /**
   * Clear search
   */
  clearSearch(allRecipes: RecipeItem[]): void {
    this.updateSearchState({
      query: '',
      isActive: false,
      results: [],
      hasResults: true
    });

    // Emit search result event with all recipes
    this.searchResult$.next({
      query: '',
      results: allRecipes,
      hasResults: true
    });
  }

  /**
   * Open search overlay
   */
  openSearchOverlay(initialQuery = ''): void {
    this.searchOverlayInitialQuery$.next(initialQuery);

    const currentState = this.searchState$.value;
    this.searchState$.next({
      ...currentState,
      isOverlayOpen: true
    });

    // Prevent body scrolling when overlay is open
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close search overlay
   */
  closeSearchOverlay(): void {
    const currentState = this.searchState$.value;
    this.searchState$.next({
      ...currentState,
      isOverlayOpen: false
    });

    // Restore body scrolling
    document.body.style.overflow = '';
  }

  /**
   * Handle search overlay selection
   */
  handleSearchOverlaySelect(selectedRecipe: SelectedSuggestion): void {
    // Navigate to the selected recipe using slug
    this.router.navigate(['/recipes', selectedRecipe.category, selectedRecipe.slug]);

    // Close overlay
    this.closeSearchOverlay();
  }

  /**
   * Check if an input element is currently focused
   */
  isInputFocused(): boolean {
    const activeElement = document.activeElement;
    return !!(activeElement instanceof HTMLInputElement ||
           activeElement instanceof HTMLTextAreaElement ||
           (activeElement && activeElement.tagName === 'INPUT') ||
           (activeElement && activeElement.tagName === 'TEXTAREA'));
  }

  /**
   * Get whether search overlay is open
   */
  isSearchOverlayOpen(): boolean {
    return this.searchState$.value.isOverlayOpen;
  }

  /**
   * Get current search query
   */
  getCurrentQuery(): string {
    return this.searchState$.value.query;
  }

  /**
   * Check if search is active
   */
  isSearchActive(): boolean {
    return this.searchState$.value.isActive;
  }
}
