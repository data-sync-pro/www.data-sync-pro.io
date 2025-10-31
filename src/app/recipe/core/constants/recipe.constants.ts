/**
 * Recipe-related constants
 * Centralizes magic numbers, strings, and configuration values
 */

/**
 * Standard category ordering for recipe listings and filters
 */
export const RECIPE_CATEGORY_ORDER: string[] = [
  'Batch',
  'Trigger',
  'Data List',
  'Action Button',
  'Data Loader'
];

/**
 * CSS class names used in recipe components
 */
export const RECIPE_CLASSES = {
  BODY_PAGE: 'recipe-page',
  VERSION_TAG: 'version-tag',
  KEYWORD_TAG: 'keyword-tag',
  TAG: 'tag'
} as const;

/**
 * Default values and identifiers
 */
export const RECIPE_DEFAULTS = {
  SECTION_ID: 'recipe-overview',
  USE_CASE_ID: 'use-case',
  MOBILE_BREAKPOINT: 768,
  HEADER_OFFSET: 80
} as const;

/**
 * User-facing messages and text
 */
export const RECIPE_MESSAGES = {
  // Loading states
  LOADING: 'Loading recipes...',
  LOADING_CATEGORY: 'Loading category recipes...',
  LOADING_RECIPE: 'Loading recipe details...',

  // Empty states
  NO_RECIPES: 'No recipes found',
  NO_RESULTS: 'No search results found',
  NO_STEPS: 'No walkthrough steps available',
  NO_CATEGORY: 'Category not found',

  // Errors
  ERROR_LOAD_CATEGORIES: 'Failed to load categories. Please try again.',
  ERROR_LOAD_RECIPES: 'Failed to load recipes. Please try again.',
  ERROR_LOAD_RECIPE: 'Failed to load recipe details. Please try again.',
  ERROR_PREVIEW: 'Failed to load preview. Please check the recipe ID.',

  // Actions
  DOWNLOAD: 'Download',
  COPY: 'Copy to clipboard',
  BACK: 'Back to recipes',

  // Placeholders
  FIELD_NA: 'N/A',
  DOWNLOAD_DOCUMENT: 'Download Document'
} as const;

/**
 * Section and tab identifiers
 */
export const RECIPE_SECTIONS = {
  // Overview sections
  OVERVIEW: 'overview',
  RECIPE_OVERVIEW: 'recipe-overview',
  USE_CASE: 'use-case',
  WHEN_TO_USE: 'when-to-use',
  PREREQUISITES: 'prerequisites',
  VERSIONS: 'versions',
  KEYWORDS: 'keywords',
  DOWNLOADS: 'downloads',
  RELATED: 'related-recipes',

  // Walkthrough sections
  WALKTHROUGH: 'walkthrough',
  STEP_PREFIX: 'step-'
} as const;

/**
 * Content type identifiers for section rendering
 */
export const CONTENT_TYPES = {
  HTML: 'html',
  TEXT: 'text',
  TAG_LIST: 'tag-list',
  LIST: 'list',
  DOWNLOAD_LIST: 'download-list',
  LINK_LIST: 'link-list',
  PREREQUISITES: 'prerequisites',
  VERSION_INFO: 'version-info',
  USE_CASE_HIGHLIGHT: 'use-case-highlight'
} as const;

/**
 * Media types for walkthrough steps
 */
export const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  LINK: 'link',
  DOCUMENT: 'document'
} as const;

/**
 * View states
 */
export const VIEW_STATES = {
  HOME: 'home',
  CATEGORY: 'category',
  RECIPE: 'recipe'
} as const;

/**
 * Tab identifiers
 */
export const TAB_IDS = {
  OVERVIEW: 'overview',
  WALKTHROUGH: 'walkthrough'
} as const;

/**
 * Tab titles
 */
export const TAB_TITLES = {
  OVERVIEW: 'Overview',
  WALKTHROUGH: 'Walkthrough'
} as const;

/**
 * Storage keys for persisting state
 */
export const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: 'recipeSidebarCollapsed'
} as const;

/**
 * Navigation event types
 */
export const NAVIGATION_EVENTS = {
  SECTION_CHANGED: 'section-changed',
  USER_SCROLLED: 'user-scrolled'
} as const;

/**
 * Query parameter names
 */
export const QUERY_PARAMS = {
  PREVIEW: 'preview',
  RECIPE_ID: 'recipeId'
} as const;

/**
 * Route parameter names
 */
export const ROUTE_PARAMS = {
  CATEGORY: 'category',
  RECIPE_NAME: 'recipeName'
} as const;

/**
 * Accessibility labels
 */
export const ARIA_LABELS = {
  TOC_NAV: 'Recipe table of contents',
  DOWNLOAD_BUTTON: 'Download',
  COPY_BUTTON: 'Copy to clipboard',
  BACK_BUTTON: 'Back to recipes',
  CLOSE_BUTTON: 'Close',
  TOGGLE_SIDEBAR: 'Toggle sidebar'
} as const;

/**
 * Icon names (Salesforce Lightning Design System)
 */
export const ICON_NAMES = {
  DOWNLOAD: 'utility:download',
  LINK: 'utility:link',
  DOCUMENT: 'utility:description',
  COPY: 'utility:copy',
  CHECKMARK: 'utility:check'
} as const;
