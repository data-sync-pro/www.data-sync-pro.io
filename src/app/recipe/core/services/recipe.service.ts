import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError, combineLatest } from 'rxjs';
import { map, catchError, shareReplay, tap, finalize, switchMap } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AutoLinkService } from '../../../shared/services/auto-link.service';
import { generateSlug } from '../../../shared/utils/slug.utils';
import { RECIPE_CATEGORY_ORDER } from '../constants/recipe.constants';
import { RecipeLoggerService } from './logger.service';
import { LocalStorageService } from './local-storage.service';

import {
  SourceRecipeRecord,
  RecipeItem,
  RecipeCategory,
  RecipeSearchResult,
  RecipeFilter,
  RecipeStats,
  RecipeProgress,
  RecipeEvent,
  RecipeCategoryType,
  LegacyRecipeWalkthrough,
  RecipeWalkthroughStep,
  RecipeExecutable
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

/**
 * Extended SourceRecipeRecord with runtime metadata
 * Includes properties added during data loading and proper typing for legacy format
 */
interface SourceRecipeRecordWithMetadata extends Omit<SourceRecipeRecord, 'walkthrough'> {
  __folderId?: string;
  walkthrough: RecipeWalkthroughStep[] | LegacyRecipeWalkthrough;
  downloadableExecutable?: RecipeExecutable;
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
  private readonly STORAGE_KEY_RECIPE_CONTENT = 'recipe_content_cache_v2'; // Updated to force cache refresh
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
    'batch': 'Batch',
    'data-list': 'Data List',
    'data-loader': 'Data Loader',
    'triggers': 'Trigger'
  };
  
  private readonly CATEGORY_DESCRIPTIONS: { [key in RecipeCategoryType]: string } = {
    'action-button': 'A quick action or button that uses the current record, applies scoping, matching, and field transformations, allows edits, and then performs a DML action.',
    'batch': 'A job that processes large data sets in batches, applying filters, matching, transformations, and executing DML actions per batch.',
    'data-list': 'A query-driven list that supports inline and bulk operations. Users can select records, apply transformations, edit, and perform DML actions.',
    'data-loader': 'A tool for transforming and loading CSV data into Salesforce efficiently, with matching, access control, and centralized error logging.',
    'triggers': 'A modular, bulk-safe routine that reacts to DML events, applies scoping, transforms fields, validates, and performs DML actions.'
  };

  // Use shared category order constant
  private readonly CATEGORY_ORDER = RECIPE_CATEGORY_ORDER;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private autoLinkService: AutoLinkService,
    private logger: RecipeLoggerService,
    private storage: LocalStorageService
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
        this.logger.error('Failed to load recipes', error);
        this.recipesCache$.next([]);
      }
    });
  }


  /**
   * Get recipe by ID
   */
  getRecipeById(id: string): Observable<RecipeItem> {
    return this.recipesCache$.pipe(
      map(recipes => {
        const recipe = recipes.find(r => r.id === id);
        if (!recipe) {
          throw new Error(`Recipe not found: ${id}`);
        }
        return recipe;
      })
    );
  }

  /**
   * Load recipes from individual folders using dynamic discovery
   */
  private loadFolderRecipes(): Observable<SourceRecipeRecordWithMetadata[]> {
    // First, load the recipe index to get available recipe folders
    return this.http.get<RecipeIndexConfig>(this.RECIPE_INDEX_URL).pipe(
      map(indexConfig => indexConfig.recipes.filter(item => item.active)),
      switchMap(activeRecipes => {
        if (activeRecipes.length === 0) {
          return of([]);
        }

        const recipeRequests = activeRecipes.map(recipeIndex =>
          this.http.get<SourceRecipeRecordWithMetadata>(`${this.RECIPE_FOLDERS_BASE}${recipeIndex.folderId}/recipe.json`).pipe(
            map(recipe => {
              // Add the actual folder ID to the recipe object for correct path resolution
              if (recipe) {
                recipe.__folderId = recipeIndex.folderId;
              }
              return recipe;
            }),
            catchError(error => {
              this.logger.warn(`Failed to load recipe from folder ${recipeIndex.folderId}`, error);
              return of(null);
            })
          )
        );

        return combineLatest(recipeRequests).pipe(
          map(recipes => recipes.filter(recipe => recipe !== null) as SourceRecipeRecordWithMetadata[])
        );
      }),
      catchError(error => {
        this.logger.error('Failed to load recipe index', error);
        return of([]);
      })
    );
  }

  /**
   * Transform source recipe records to application format
   */
  private transformRecipeRecords(records: SourceRecipeRecordWithMetadata[]): RecipeItem[] {
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
   * Process downloadable executables to convert relative paths to absolute paths
   */
  private processDownloadableExecutables(executables: any[], folderId: string): any[] {
    if (!executables || !Array.isArray(executables)) {
      return [];
    }
    
    return executables.map(executable => {
      if (executable.filePath && !executable.filePath.startsWith('http') && !executable.filePath.startsWith('/')) {
        return {
          ...executable,
          filePath: `${this.RECIPE_FOLDERS_BASE}${folderId}/${executable.filePath}`
        };
      }
      return executable;
    });
  }

  /**
   * Check if record is in new format
   */
  private isNewFormat(record: SourceRecipeRecordWithMetadata): boolean {
    return Array.isArray(record.walkthrough) &&
           !!(record.overview || record.usecase) &&
           Array.isArray(record.prerequisites);
  }

  /**
   * Transform a single record to handle both new and legacy formats
   */
  private transformSingleRecord(record: SourceRecipeRecordWithMetadata): RecipeItem {
    return this.isNewFormat(record)
      ? this.transformNewFormatRecord(record)
      : this.transformLegacyRecord(record);
  }

  /**
   * Transform new format record
   */
  private transformNewFormatRecord(record: SourceRecipeRecordWithMetadata): RecipeItem {
    // Use the actual folder ID for image paths, fallback to record.id if not available
    const folderId = record.__folderId || record.id;

    return {
      // New format fields
      id: record.id,
      title: record.title,
      slug: generateSlug(record.title),
      category: record.category,
      DSPVersions: record.DSPVersions || [],
      overview: record.overview || record.usecase || '',
      safeOverview: this.sanitizer.bypassSecurityTrustHtml(
        this.autoLinkService.applyAutoLinkTerms(record.overview || record.usecase || '')
      ),
      whenToUse: record.whenToUse || '',
      safeWhenToUse: record.whenToUse ? this.sanitizer.bypassSecurityTrustHtml(
        this.autoLinkService.applyAutoLinkTerms(record.whenToUse)
      ) : undefined,
      generalImages: record.generalImages || [],
      prerequisites: record.prerequisites || [],
      direction: record.direction || '',
      safeDirection: record.direction ? this.sanitizer.bypassSecurityTrustHtml(
        this.autoLinkService.applyAutoLinkTerms(record.direction)
      ) : this.sanitizer.bypassSecurityTrustHtml(''),
      connection: record.connection || '',
      walkthrough: this.processWalkthroughImagePaths((record.walkthrough as RecipeWalkthroughStep[]) || [], folderId),
      downloadableExecutables: this.processDownloadableExecutables(record.downloadableExecutables || [], folderId),
      relatedRecipes: record.relatedRecipes || [],
      keywords: record.keywords || [],

      // Legacy compatibility fields
      usecase: record.usecase || record.overview || '',
      safeUsecase: this.sanitizer.bypassSecurityTrustHtml(
        this.autoLinkService.applyAutoLinkTerms(record.usecase || record.overview || '')
      ),

      // Legacy compatibility fields
      name: record.name,
      description: record.description,
      useCase: record.useCase,
      safeUseCase: record.useCase ? this.sanitizer.bypassSecurityTrustHtml(
        this.autoLinkService.applyAutoLinkTerms(record.useCase)
      ) : undefined,
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
  }

  /**
   * Transform legacy format record
   */
  private transformLegacyRecord(record: SourceRecipeRecordWithMetadata): RecipeItem {
    // Legacy format - maintain backward compatibility
    return {
      // Required new format fields (with defaults)
      id: record.id,
      title: record.title,
      slug: generateSlug(record.title),
      category: record.category,
      DSPVersions: [],
      overview: record.useCase || record.description || '',
      safeOverview: this.sanitizer.bypassSecurityTrustHtml(
        this.autoLinkService.applyAutoLinkTerms(record.useCase || record.description || '')
      ),
      whenToUse: '',
      safeWhenToUse: undefined,
      generalImages: [],
      prerequisites: Array.isArray(record.prerequisites) ? record.prerequisites : [],
      direction: '',
      safeDirection: this.sanitizer.bypassSecurityTrustHtml(''),
      connection: '',
      walkthrough: [],
      downloadableExecutables: record.downloadableExecutable ? [{
        title: record.downloadableExecutable.description || record.downloadableExecutable.fileName,
        url: record.downloadableExecutable.filePath
      }] : [],
      relatedRecipes: [],
      keywords: record.tags || [],

      // Legacy compatibility fields
      usecase: record.useCase || record.description || '',
      safeUsecase: this.sanitizer.bypassSecurityTrustHtml(
        this.autoLinkService.applyAutoLinkTerms(record.useCase || record.description || '')
      ),

      // Legacy fields
      name: record.name,
      description: record.description,
      useCase: record.useCase,
      safeUseCase: record.useCase ? this.sanitizer.bypassSecurityTrustHtml(
        this.autoLinkService.applyAutoLinkTerms(record.useCase)
      ) : undefined,
      legacyWalkthrough: record.walkthrough as LegacyRecipeWalkthrough,
      downloadableExecutable: record.downloadableExecutable,
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
        displayName: this.getCategoryDisplayName(category),
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
   * Get single recipe by slug and category
   */
  getRecipe(category: string, recipeSlug: string): Observable<RecipeItem | null> {
    return this.recipesCache$.pipe(
      map(recipes => {
        const foundRecipe = recipes.find(recipe =>
          recipe.category === category && recipe.slug === recipeSlug
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
      return of(this.sortCategories(this.categoriesCache));
    }

    return this.recipesCache$.pipe(
      map(() => this.sortCategories(this.categoriesCache))
    );
  }

  /**
   * Get display name for category
   */
  private getCategoryDisplayName(category: string): string {
    const mapping: { [key: string]: string } = {
      'Batch': 'Batch',
      'Trigger': 'Trigger',
      'Data List': 'Data List',
      'Action Button': 'Action Button',
      'Data Loader': 'Data Loader'
    };
    return mapping[category] || category;
  }

  /**
   * Sort category names according to predefined order
   * Public method for use by components
   */
  sortCategoryNames(categories: string[]): string[] {
    return [...categories].sort((a, b) => {
      const indexA = this.CATEGORY_ORDER.indexOf(a);
      const indexB = this.CATEGORY_ORDER.indexOf(b);

      // If both categories are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // If only one is in the order array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // If neither is in the order array, maintain original order
      return 0;
    });
  }

  /**
   * Sort categories according to predefined order
   */
  private sortCategories(categories: RecipeCategory[]): RecipeCategory[] {
    return [...categories].sort((a, b) => {
      // Sort categories according to CATEGORY_ORDER
      const indexA = this.CATEGORY_ORDER.indexOf(a.name);
      const indexB = this.CATEGORY_ORDER.indexOf(b.name);

      // If both categories are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // If only one is in the order array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // If neither is in the order array, maintain original order
      return 0;
    });
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

      // Overview/Usecase match (new format)
      if (recipe.overview?.toLowerCase().includes(lowerQuery) || recipe.usecase?.toLowerCase().includes(lowerQuery)) {
        score += 50;
        matchedFields.push('overview');
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
          highlightedDescription: this.highlightKeywords(recipe.overview || recipe.description || recipe.usecase || '', [query])
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
   * Uses LocalStorageService for consistent storage
   */
  saveRecipeProgress(progress: RecipeProgress): void {
    const existingProgress = this.getRecipeProgress();
    existingProgress[progress.recipeId] = progress;

    this.storage.setItem(this.STORAGE_KEY_RECIPE_PROGRESS, existingProgress);
  }

  /**
   * Get recipe progress
   * Uses LocalStorageService for consistent storage
   */
  getRecipeProgress(): { [recipeId: string]: RecipeProgress } {
    return this.storage.getItem<{ [recipeId: string]: RecipeProgress }>(
      this.STORAGE_KEY_RECIPE_PROGRESS,
      {}
    ) || {};
  }

  /**
   * Track recipe events
   */
  trackRecipeEvent(event: RecipeEvent): void {
    // TODO: Implement analytics tracking
    // Reserved for future analytics integration
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
   * Save to local storage with TTL
   * Uses LocalStorageService for consistent caching
   */
  private saveToLocalStorage(recipes: RecipeItem[]): void {
    this.storage.setItem(
      this.STORAGE_KEY_RECIPE_CONTENT,
      recipes,
      { version: '1.0' }
    );
  }

  /**
   * Load from local storage with automatic TTL check
   * Uses LocalStorageService for consistent caching
   */
  private loadFromLocalStorage(): void {
    const recipes = this.storage.getItemWithTTL<RecipeItem[]>(
      this.STORAGE_KEY_RECIPE_CONTENT,
      this.CACHE_TTL
    );

    if (recipes && recipes.length > 0) {
      this.recipesCache$.next(recipes);
      this.updateCategoriesCache(recipes);
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

  /**
   * Sort recipes by category first, then by title A-Z
   * @param recipes - Array of recipes to sort
   * @returns Sorted array of recipes
   */
  sortRecipesByCategoryAndTitle(recipes: RecipeItem[]): RecipeItem[] {
    return [...recipes].sort((a, b) => {
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) {
        return categoryCompare;
      }
      return a.title.localeCompare(b.title);
    });
  }
}