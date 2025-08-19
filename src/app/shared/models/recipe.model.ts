import { SafeHtml } from '@angular/platform-browser';

/**
 * General image for recipe (not tied to specific step)
 */
export interface RecipeGeneralImage {
  type: 'image' | 'video' | 'gif';
  url: string;
  alt: string;
  imageId?: string;
  displayUrl?: string; // Runtime property for displaying blob URLs
}

/**
 * Raw recipe data record (from JSON file)
 */
export interface SourceRecipeRecord {
  id: string; // Auto generated
  title: string;
  category: string;
  DSPVersions: string[];
  overview: string; // Replaces usecase with more detailed description
  whenToUse?: string; // When to use this recipe
  generalImages: RecipeGeneralImage[]; // Images not tied to specific steps
  prerequisites: RecipePrerequisiteItem[];
  direction: string;
  connection: string;
  walkthrough: RecipeWalkthroughStep[];
  downloadableExecutables: RecipeDownloadableExecutable[];
  relatedRecipes: RecipeRelatedItem[];
  keywords: string[];
  // Legacy fields for backward compatibility
  name?: string;
  description?: string;
  usecase?: string; // Legacy field, use overview instead
  useCase?: string;
  tags?: string[];
  lastUpdated?: string;
  author?: string;
  seqNo?: number;
}

/**
 * Recipe walkthrough step
 */
export interface RecipeWalkthroughStep {
  step: string;
  config: RecipeStepConfig[];
  media: RecipeStepMedia[];
}

/**
 * Recipe step configuration
 */
export interface RecipeStepConfig {
  field: string;
  value: string;
}

/**
 * Recipe step media
 */
export interface RecipeStepMedia {
  type: string;
  url: string;
  alt: string;
  displayUrl?: string; // Cached blob URL for IndexedDB images
}

/**
 * Recipe prerequisite item
 */
export interface RecipePrerequisiteItem {
  description: string;
  quickLinks: RecipeQuickLink[];
}

/**
 * Recipe quick link
 */
export interface RecipeQuickLink {
  title: string;
  url: string;
}

/**
 * Recipe downloadable executable
 */
export interface RecipeDownloadableExecutable {
  title?: string;
  url?: string;
  filePath?: string; // New format - path to downloadable file
}

/**
 * Recipe related item
 */
export interface RecipeRelatedItem {
  title: string;
  url: string;
}

/**
 * Legacy recipe walkthrough interface (for backward compatibility)
 */
export interface LegacyRecipeWalkthrough {
  createExecutable: {
    sourceObjectApiName: string;
    targetObjectApiName: string;
    sourceMatchingField: string;
    targetMatchingField: string;
    action: string;
    executableName: string;
    instructions: string;
  };
  retrieve: {
    soqlQueries: CodeExample[];
    instructions: string;
  };
  scoping: {
    scopeFilterSetup: string;
    instructions: string;
  };
  match: {
    matchingLogic: string;
    rules: string;
    instructions: string;
  };
  mapping: {
    fieldMappingConfig: string;
    instructions: string;
  };
  action: {
    actionConfiguration: string;
    options: string;
    instructions: string;
  };
  verify: {
    verificationQueries: CodeExample[];
    instructions: string;
  };
  previewTransformed: {
    previewInstructions: string;
    expectedResults: string;
  };
  addSchedule: {
    schedulingConfig: string;
    setupGuide: string;
  };
}

/**
 * Code example with syntax highlighting support
 */
export interface CodeExample {
  code: string;
  language: 'soql' | 'apex' | 'sql' | 'json' | 'xml';
  description?: string;
  title?: string;
}

/**
 * Processed recipe item (used in application)
 */
export interface RecipeItem {
  id: string;
  title: string;
  category: string;
  DSPVersions: string[];
  overview: string; // Updated from usecase
  safeOverview?: SafeHtml; // Safe HTML version of overview
  whenToUse?: string;
  safeWhenToUse?: SafeHtml;
  generalImages: RecipeGeneralImage[];
  prerequisites: RecipePrerequisiteItem[];
  direction: string;
  safeDirection?: SafeHtml;
  connection: string;
  walkthrough: RecipeWalkthroughStep[];
  downloadableExecutables: RecipeDownloadableExecutable[];
  relatedRecipes: RecipeRelatedItem[];
  keywords: string[];
  
  // Legacy fields for backward compatibility
  usecase?: string; // Legacy field, use overview instead
  safeUsecase?: SafeHtml;
  
  // Legacy fields for backward compatibility
  name?: string;
  description?: string;
  useCase?: string;
  safeUseCase?: SafeHtml;
  legacyWalkthrough?: LegacyRecipeWalkthrough;
  downloadableExecutable?: RecipeExecutable;
  tags?: string[];
  lastUpdated?: Date;
  author?: string;
  seqNo?: number;
  
  // Runtime properties
  isExpanded?: boolean;
  isLoading?: boolean;
  viewCount?: number;
  userRating?: boolean | null;
  isPopular?: boolean;
  currentStep?: number;
  completedSteps?: number[];
  showSocialShare?: boolean;
}

/**
 * Legacy recipe prerequisites (for backward compatibility)
 */
export interface RecipePrerequisites {
  permissionSetsForBuilding: string[];
  permissionSetsForUsing: string[];
  directions: string;
  safeDirections?: SafeHtml;
}

/**
 * Recipe executable download
 */
export interface RecipeExecutable {
  fileName: string;
  filePath: string;
  version: string;
  description: string;
  downloadCount?: number;
  fileSize?: string;
}

/**
 * Recipe category information
 */
export interface RecipeCategory {
  name: string;
  displayName: string;
  description: string;
  count: number;
  iconClass?: string;
}

/**
 * Recipe search result
 */
export interface RecipeSearchResult extends RecipeItem {
  relevanceScore?: number;
  highlightedTitle?: string;
  highlightedDescription?: string;
  matchedFields?: string[];
}

/**
 * Recipe navigation state
 */
export interface RecipeNavigationState {
  category: string;
  recipeName: string;
  currentStep?: number;
}

/**
 * Recipe progress tracking
 */
export interface RecipeProgress {
  recipeId: string;
  currentStep: number;
  completedSteps: number[];
  timeSpent: number; // in minutes
  lastAccessed: Date;
  notes?: string;
}

/**
 * Recipe statistics
 */
export interface RecipeStats {
  totalRecipes: number;
  totalCategories: number;
  mostViewedRecipes: RecipeItem[];
  recentlyUpdated: RecipeItem[];
  avgCompletionTime: number;
  popularCategories: { category: string; count: number }[];
}

/**
 * Recipe filter options
 */
export interface RecipeFilter {
  categories: string[];
  searchQuery: string;
  showPopularOnly: boolean;
  tags: string[];
}

/**
 * Recipe sort options
 */
export interface RecipeSortOptions {
  field: 'title' | 'category' | 'viewCount' | 'lastUpdated';
  direction: 'asc' | 'desc';
}

/**
 * Recipe event tracking
 */
export interface RecipeEvent {
  type: 'view' | 'step_complete' | 'download' | 'rate' | 'search';
  recipeId?: string;
  recipeTitle?: string;
  recipeCategory?: string;
  stepNumber?: number;
  stepName?: string;
  searchQuery?: string;
  rating?: boolean;
  timestamp: Date;
  userId?: string;
}

/**
 * Recipe section definition for detailed TOC navigation
 */
export interface RecipeSection {
  id: string;
  title: string;
  icon: string;
  description?: string;
  elementId?: string; // DOM element ID for scrolling
  isVisible?: boolean; // Whether this section exists in current recipe
}

/**
 * Recipe tab with sections for hierarchical TOC navigation
 */
export interface RecipeTab {
  id: string;
  title: string;
  icon: string;
  description: string;
  sections: RecipeSection[];
  isExpanded?: boolean;
}

/**
 * Complete recipe TOC structure
 */
export interface RecipeTOCStructure {
  tabs: RecipeTab[];
  currentTabId?: string;
  currentSectionId?: string;
  // expandedTabs: Set<string>; // No longer used since TOC doesn't show tabs
}

/**
 * Recipe content status
 */
export enum RecipeContentStatus {
  NOT_LOADED = 'not_loaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

/**
 * Recipe step types for walkthrough (legacy and new)
 */
export type RecipeStepType = 
  | 'createExecutable'
  | 'retrieve'
  | 'scoping'
  | 'match'
  | 'mapping'
  | 'action'
  | 'verify'
  | 'previewTransformed'
  | 'addSchedule'
  | 'custom'; // For new flexible step structure


/**
 * Recipe categories (from Rules Engines subcategories)
 */
export type RecipeCategoryType = 'action-button' | 'batch' | 'data-list' | 'data-loader' | 'triggers';

/**
 * Combined recipe walkthrough type (supports both legacy and new formats)
 */
export type RecipeWalkthrough = LegacyRecipeWalkthrough | RecipeWalkthroughStep[];