import { SafeHtml } from '@angular/platform-browser';

/**
 * Raw recipe data record (from JSON file)
 */
export interface SourceRecipeRecord {
  id: string;
  name: string;
  title: string;
  category: string; // One of: action-button, batch, data-list, data-loader, triggers
  description: string;
  useCase: string; // Rich text describing target/goal
  prerequisites: {
    permissionSetsForBuilding: string[];
    permissionSetsForUsing: string[];
    directions: string; // Setup guidance and preparation steps
  };
  walkthrough: RecipeWalkthrough;
  downloadableExecutable?: {
    fileName: string;
    filePath: string;
    version: string;
    description: string;
  };
  tags: string[];
  lastUpdated: string;
  author?: string;
  seqNo?: number;
}

/**
 * Recipe walkthrough with structured steps
 */
export interface RecipeWalkthrough {
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
  name: string;
  title: string;
  category: string;
  description: string;
  useCase: string;
  safeUseCase?: SafeHtml;
  prerequisites: RecipePrerequisites;
  walkthrough: RecipeWalkthrough;
  downloadableExecutable?: RecipeExecutable;
  tags: string[];
  lastUpdated: Date;
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
 * Recipe prerequisites
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
  expandedTabs: Set<string>;
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
 * Recipe step types for walkthrough
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
  | 'addSchedule';


/**
 * Recipe categories (from Rules Engines subcategories)
 */
export type RecipeCategoryType = 'action-button' | 'batch' | 'data-list' | 'data-loader' | 'triggers';