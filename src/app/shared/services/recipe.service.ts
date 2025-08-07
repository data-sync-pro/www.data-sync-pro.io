import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError, combineLatest } from 'rxjs';
import { map, catchError, shareReplay, tap, finalize, switchMap } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import {
  SourceRecipeRecord,
  RecipeItem,
  RecipeCategory,
  RecipeSearchResult,
  RecipeFilter,
  RecipeSortOptions,
  RecipeStats,
  RecipeProgress,
  RecipeEvent,
  RecipeContentStatus,
  RecipeCategoryType,
  RecipeWalkthroughStep,
  LegacyRecipeWalkthrough
} from '../models/recipe.model';

/**
 * Recipe index configuration
 */
interface RecipeIndexConfig {
  recipes: RecipeIndexItem[];
}

interface RecipeIndexItem {
  folderId: string;
  name: string;
  category: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeService implements OnDestroy {
  private readonly RECIPE_FOLDERS_BASE = 'assets/recipes/';
  private readonly RECIPE_INDEX_URL = 'assets/recipes/index.json';
  
  // Cache
  private recipesCache$ = new BehaviorSubject<RecipeItem[]>([]);
  private contentCache = new Map<string, SafeHtml>();
  private categoriesCache: RecipeCategory[] = [];
  
  // Local Storage Cache Keys
  private readonly STORAGE_KEY_RECIPE_CONTENT = 'recipe_content_cache';
  private readonly STORAGE_KEY_RECIPE_PROGRESS = 'recipe_progress_cache';
  private readonly STORAGE_KEY_POPULAR_RECIPES = 'popular_recipes_cache';
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  // Loading state
  private isLoading = false;
  private isInitialized = false;
  
  // Preloading
  private preloadingQueue = new Set<string>();
  private intersectionObserver?: IntersectionObserver;
  private readonly PRELOAD_THRESHOLD = 0.1;
  
  // Categories mapping
  private readonly CATEGORY_DISPLAY_NAMES: { [key in RecipeCategoryType]: string } = {
    'action-button': 'Action Button',
    'batch': 'Batch Processing',
    'data-list': 'Data List',
    'data-loader': 'Data Loader',
    'triggers': 'Triggers'
  };
  
  private readonly CATEGORY_DESCRIPTIONS: { [key in RecipeCategoryType]: string } = {
    'action-button': 'A quick action or button that uses the current record, applies scoping, matching, and field transformations, allows edits, and then performs a DML action.',
    'batch': 'A job that processes large data sets in batches, applying filters, matching, transformations, and executing DML actions per batch.',
    'data-list': 'A query-driven list that supports inline and bulk operations. Users can select records, apply transformations, edit, and perform DML actions.',
    'data-loader': 'A tool for transforming and loading CSV data into Salesforce efficiently, with matching, access control, and centralized error logging.',
    'triggers': 'A modular, bulk-safe routine that reacts to DML events, applies scoping, transforms fields, validates, and performs DML actions.'
  };

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    this.initializeService();
    this.initializeIntersectionObserver();
    this.loadFromLocalStorage();
  }

  ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  /**
   * Initialize service
   */
  private initializeService(): void {
    if (!this.isInitialized) {
      this.loadRecipes();
      this.isInitialized = true;
    }
  }

  /**
   * Load recipes from multiple sources
   */
  private loadRecipes(): void {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    // Load recipes from folders
    this.loadFolderRecipes().pipe(
      map(recipes => this.transformRecipeRecords(recipes)),
      tap(recipes => this.updateCategoriesCache(recipes)),
      shareReplay(1),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (recipes) => {
        this.recipesCache$.next(recipes);
        this.saveToLocalStorage(recipes);
      },
      error: (error) => {
        console.error('Failed to load recipes:', error);
        this.recipesCache$.next([]);
      }
    });
  }


  /**
   * Load recipes from individual folders using dynamic discovery
   */
  private loadFolderRecipes(): Observable<SourceRecipeRecord[]> {
    // First, load the recipe index to get available recipe folders
    return this.http.get<RecipeIndexConfig>(this.RECIPE_INDEX_URL).pipe(
      map(indexConfig => indexConfig.recipes.filter(item => item.active)),
      switchMap(activeRecipes => {
        if (activeRecipes.length === 0) {
          return of([]);
        }

        const recipeRequests = activeRecipes.map(recipeIndex => 
          this.http.get<SourceRecipeRecord>(`${this.RECIPE_FOLDERS_BASE}${recipeIndex.folderId}/recipe.json`).pipe(
            catchError(error => {
              console.warn(`Failed to load recipe from folder ${recipeIndex.folderId}:`, error);
              return of(null);
            })
          )
        );

        return combineLatest(recipeRequests).pipe(
          map(recipes => recipes.filter(recipe => recipe !== null) as SourceRecipeRecord[])
        );
      }),
      catchError(error => {
        console.error('Failed to load recipe index:', error);
        return of([]);
      })
    );
  }

  /**
   * Transform source recipe records to application format
   */
  private transformRecipeRecords(records: SourceRecipeRecord[]): RecipeItem[] {
    return records.map(record => this.transformSingleRecord(record));
  }

  /**
   * Process walkthrough steps to convert relative image paths to absolute paths
   */
  private processWalkthroughImagePaths(walkthrough: any[], recipeId: string): any[] {
    return walkthrough.map(step => {
      if (step.media && Array.isArray(step.media)) {
        step.media = step.media.map((media: any) => {
          if (media.type === 'image' && media.url && media.url.startsWith('images/')) {
            return {
              ...media,
              url: `${this.RECIPE_FOLDERS_BASE}${recipeId}/${media.url}`
            };
          }
          return media;
        });
      }
      return step;
    });
  }

  /**
   * Transform a single record to handle both new and legacy formats
   */
  private transformSingleRecord(record: SourceRecipeRecord): RecipeItem {
    // Check if this is a new format record (based on walkthrough being an array)
    if (Array.isArray(record.walkthrough) && record.usecase && Array.isArray(record.prerequisites)) {
      return {
        // New format fields
        id: record.id,
        title: record.title,
        category: record.category,
        DSPVersions: record.DSPVersions || [],
        usecase: record.usecase,
        safeUsecase: this.sanitizer.bypassSecurityTrustHtml(record.usecase),
        prerequisites: record.prerequisites || [],
        direction: record.direction || '',
        safeDirection: record.direction ? this.sanitizer.bypassSecurityTrustHtml(record.direction) : this.sanitizer.bypassSecurityTrustHtml(''),
        connection: record.connection || '',
        walkthrough: this.processWalkthroughImagePaths(record.walkthrough || [], record.id),
        downloadableExecutables: record.downloadableExecutables || [],
        relatedRecipes: record.relatedRecipes || [],
        keywords: record.keywords || [],
        
        // Legacy compatibility fields
        name: record.name,
        description: record.description,
        useCase: record.useCase,
        safeUseCase: record.useCase ? this.sanitizer.bypassSecurityTrustHtml(record.useCase) : undefined,
        tags: record.tags,
        lastUpdated: record.lastUpdated ? new Date(record.lastUpdated) : undefined,
        author: record.author,
        seqNo: record.seqNo,
        
        // Runtime properties
        isExpanded: false,
        isLoading: false,
        viewCount: 0,
        currentStep: 0,
        completedSteps: [],
        showSocialShare: false
      };
    } else {
      // Legacy format - maintain backward compatibility
      return {
        // Required new format fields (with defaults)
        id: record.id,
        title: record.title,
        category: record.category,
        DSPVersions: [],
        usecase: record.useCase || record.description || '',
        safeUsecase: this.sanitizer.bypassSecurityTrustHtml(record.useCase || record.description || ''),
        prerequisites: record.prerequisites as any || [],
        direction: '',
        safeDirection: this.sanitizer.bypassSecurityTrustHtml(''),
        connection: '',
        walkthrough: [],
        downloadableExecutables: (record as any).downloadableExecutable ? [{
          title: (record as any).downloadableExecutable.description || (record as any).downloadableExecutable.fileName,
          url: (record as any).downloadableExecutable.filePath
        }] : [],
        relatedRecipes: [],
        keywords: record.tags || [],
        
        // Legacy fields
        name: record.name,
        description: record.description,
        useCase: record.useCase,
        safeUseCase: record.useCase ? this.sanitizer.bypassSecurityTrustHtml(record.useCase) : undefined,
        legacyWalkthrough: record.walkthrough as any as LegacyRecipeWalkthrough,
        downloadableExecutable: (record as any).downloadableExecutable,
        tags: record.tags,
        lastUpdated: new Date(record.lastUpdated || Date.now()),
        author: record.author,
        seqNo: record.seqNo,
        
        // Runtime properties
        isExpanded: false,
        isLoading: false,
        viewCount: 0,
        currentStep: 0,
        completedSteps: [],
        showSocialShare: false
      };
    }
  }

  /**
   * Update categories cache
   */
  private updateCategoriesCache(recipes: RecipeItem[]): void {
    const categoryMap = new Map<string, number>();
    
    recipes.forEach(recipe => {
      const count = categoryMap.get(recipe.category) || 0;
      categoryMap.set(recipe.category, count + 1);
    });

    // Only include categories that actually have recipes
    this.categoriesCache = Array.from(categoryMap.entries())
      .filter(([_, count]) => count > 0)  // Only include categories with at least one recipe
      .map(([category, count]) => ({
        name: category,
        displayName: this.CATEGORY_DISPLAY_NAMES[category as RecipeCategoryType] || category,
        description: this.CATEGORY_DESCRIPTIONS[category as RecipeCategoryType] || '',
        count
      }));
  }

  /**
   * Get all recipes
   */
  getRecipes(): Observable<RecipeItem[]> {
    return this.recipesCache$.asObservable();
  }

  /**
   * Get recipes by category
   */
  getRecipesByCategory(category: string): Observable<RecipeItem[]> {
    return this.recipesCache$.pipe(
      map(recipes => recipes.filter(recipe => recipe.category === category))
    );
  }

  /**
   * Get single recipe by id and category
   */
  getRecipe(category: string, recipeId: string): Observable<RecipeItem | null> {
    return this.recipesCache$.pipe(
      map(recipes => {
        const foundRecipe = recipes.find(recipe => 
          recipe.category === category && recipe.id === recipeId
        );
        return foundRecipe || null;
      })
    );
  }

  /**
   * Get recipe categories
   */
  getCategories(): Observable<RecipeCategory[]> {
    if (this.categoriesCache.length > 0) {
      return of(this.categoriesCache);
    }
    
    return this.recipesCache$.pipe(
      map(() => this.categoriesCache)
    );
  }

  /**
   * Search recipes
   */
  searchRecipes(query: string, filter?: RecipeFilter): Observable<RecipeSearchResult[]> {
    return this.recipesCache$.pipe(
      map(recipes => {
        let filteredRecipes = recipes;

        // Apply category filter
        if (filter?.categories.length) {
          filteredRecipes = filteredRecipes.filter(recipe => 
            filter.categories.includes(recipe.category)
          );
        }


        // Apply search query
        if (query.trim()) {
          const searchResults = this.performSmartSearch(filteredRecipes, query);
          return searchResults;
        }

        // Convert to search results format
        return filteredRecipes.map(recipe => ({
          ...recipe,
          relevanceScore: 0
        }));
      })
    );
  }

  /**
   * Perform smart search with relevance scoring
   */
  private performSmartSearch(recipes: RecipeItem[], query: string): RecipeSearchResult[] {
    const lowerQuery = query.toLowerCase();
    const results: RecipeSearchResult[] = [];

    recipes.forEach(recipe => {
      let score = 0;
      const matchedFields: string[] = [];

      // Title match (highest priority)
      if (recipe.title.toLowerCase().includes(lowerQuery)) {
        score += 100;
        matchedFields.push('title');
      }

      // Description match (legacy)
      if (recipe.description?.toLowerCase().includes(lowerQuery)) {
        score += 50;
        matchedFields.push('description');
      }

      // Usecase match (new format)
      if (recipe.usecase.toLowerCase().includes(lowerQuery)) {
        score += 50;
        matchedFields.push('usecase');
      }

      // Tags match (legacy)
      if (recipe.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        score += 30;
        matchedFields.push('tags');
      }

      // Keywords match (new format)
      if (recipe.keywords?.some(keyword => keyword.toLowerCase().includes(lowerQuery))) {
        score += 30;
        matchedFields.push('keywords');
      }

      // Category match
      if (recipe.category.toLowerCase().includes(lowerQuery)) {
        score += 20;
        matchedFields.push('category');
      }

      // Use case match (legacy)
      if (recipe.useCase?.toLowerCase().includes(lowerQuery)) {
        score += 15;
        matchedFields.push('useCase');
      }

      // Connection match (new format)
      if (recipe.connection?.toLowerCase().includes(lowerQuery)) {
        score += 15;
        matchedFields.push('connection');
      }

      // Direction match (new format)
      if (recipe.direction?.toLowerCase().includes(lowerQuery)) {
        score += 15;
        matchedFields.push('direction');
      }

      if (score > 0) {
        results.push({
          ...recipe,
          relevanceScore: score,
          matchedFields,
          highlightedTitle: this.highlightKeywords(recipe.title, [query]),
          highlightedDescription: this.highlightKeywords(recipe.description || recipe.usecase, [query])
        });
      }
    });

    return results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  /**
   * Highlight keywords in text
   */
  private highlightKeywords(text: string, keywords: string[]): string {
    if (!keywords.length || !text) return text;

    return keywords.reduce((highlighted, keyword) => {
      if (!keyword.trim()) return highlighted;
      const regex = new RegExp(`(${this.escapeRegExp(keyword)})`, 'gi');
      return highlighted.replace(regex, '<mark class="search-highlight">$1</mark>');
    }, text);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Track recipe progress
   */
  saveRecipeProgress(progress: RecipeProgress): void {
    const existingProgress = this.getRecipeProgress();
    existingProgress[progress.recipeId] = progress;
    
    localStorage.setItem(
      this.STORAGE_KEY_RECIPE_PROGRESS, 
      JSON.stringify(existingProgress)
    );
  }

  /**
   * Get recipe progress
   */
  getRecipeProgress(): { [recipeId: string]: RecipeProgress } {
    const stored = localStorage.getItem(this.STORAGE_KEY_RECIPE_PROGRESS);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Track recipe events
   */
  trackRecipeEvent(event: RecipeEvent): void {
    // Implementation for analytics tracking
    console.log('Recipe event tracked:', event);
  }

  /**
   * Initialize intersection observer for preloading
   */
  private initializeIntersectionObserver(): void {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const recipeId = entry.target.getAttribute('data-recipe-id');
            if (recipeId && !this.preloadingQueue.has(recipeId)) {
              this.preloadRecipeContent(recipeId);
            }
          }
        });
      },
      { threshold: this.PRELOAD_THRESHOLD }
    );
  }

  /**
   * Preload recipe content
   */
  private preloadRecipeContent(recipeId: string): void {
    this.preloadingQueue.add(recipeId);
    // Implementation for preloading recipe content
  }

  /**
   * Save to local storage
   */
  private saveToLocalStorage(recipes: RecipeItem[]): void {
    try {
      const cacheData = {
        recipes,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(this.STORAGE_KEY_RECIPE_CONTENT, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save recipes to local storage:', error);
    }
  }

  /**
   * Load from local storage
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_RECIPE_CONTENT);
      if (stored) {
        const cacheData = JSON.parse(stored);
        const isExpired = Date.now() - cacheData.timestamp > this.CACHE_TTL;
        
        if (!isExpired && cacheData.recipes) {
          this.recipesCache$.next(cacheData.recipes);
          this.updateCategoriesCache(cacheData.recipes);
        }
      }
    } catch (error) {
      console.warn('Failed to load recipes from local storage:', error);
    }
  }

  /**
   * Get recipe statistics
   */
  getRecipeStats(): Observable<RecipeStats> {
    return this.recipesCache$.pipe(
      map(recipes => {
        const categoryStats = new Map<string, number>();
        
        recipes.forEach(recipe => {
          const count = categoryStats.get(recipe.category) || 0;
          categoryStats.set(recipe.category, count + 1);
        });

        return {
          totalRecipes: recipes.length,
          totalCategories: this.categoriesCache.length,
          mostViewedRecipes: recipes
            .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 5),
          recentlyUpdated: recipes
            .filter(recipe => recipe.lastUpdated)
            .sort((a, b) => (b.lastUpdated?.getTime() || 0) - (a.lastUpdated?.getTime() || 0))
            .slice(0, 5),
          avgCompletionTime: 0, // Removed estimatedTime calculation
          popularCategories: Array.from(categoryStats.entries())
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
        };
      })
    );
  }
}