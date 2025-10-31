import { Injectable } from '@angular/core';
import { RecipeItem, RecipeTOCStructure, RecipeSection, RecipeTab } from '../../core/models/recipe.model';

/**
 * Section configuration for dynamic TOC generation
 */
export interface SectionConfig {
  id: string;
  title: string;
  elementId: string;
  contentType: string;
  isVisible: () => boolean;
  getData: () => any;
  alwaysShow?: boolean;
  isHighlight?: boolean;
  tagClass?: string;
}

/**
 * Service responsible for generating and managing Recipe Table of Contents structure
 *
 * This service handles:
 * - TOC structure generation for overview and walkthrough sections
 * - Section visibility logic
 * - Section data retrieval
 * - Content validation
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeTocService {

  /**
   * Current recipe being processed
   */
  private currentRecipe: RecipeItem | null = null;

  /**
   * Cache for getVisibleOverviewSections to avoid redundant calculations
   * Cleared when recipe changes
   */
  private cachedOverviewSections?: any[];
  private cachedRecipeId?: string;

  constructor() { }

  /**
   * Set the current recipe for TOC generation
   * Clears cache when recipe changes
   */
  setCurrentRecipe(recipe: RecipeItem | null): void {
    // Clear cache if recipe has changed
    if (this.currentRecipe?.id !== recipe?.id) {
      this.cachedOverviewSections = undefined;
      this.cachedRecipeId = undefined;
    }
    this.currentRecipe = recipe;
  }

  /**
   * Generate complete TOC structure for a recipe
   */
  generateRecipeTOCStructure(): RecipeTOCStructure {
    const recipeTOC: RecipeTOCStructure = {
      tabs: []
    };

    if (!this.currentRecipe) {
      return recipeTOC;
    }

    const tabs: RecipeTab[] = [];

    // Generate Overview sections
    const overviewSections = this.generateOverviewSections();
    if (overviewSections.length > 0) {
      tabs.push({
        id: 'overview',
        title: 'Overview',
        sections: overviewSections
      });
    }

    // Generate Walkthrough sections
    const walkthroughSections = this.generateWalkthroughSections();
    if (walkthroughSections.length > 0) {
      tabs.push({
        id: 'walkthrough',
        title: 'Walkthrough',
        sections: walkthroughSections
      });
    }

    recipeTOC.tabs = tabs;
    return recipeTOC;
  }

  /**
   * Overview section configurations
   */
  private getOverviewSectionConfigs(): SectionConfig[] {
    return [
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
  }

  /**
   * Generate Overview sections dynamically based on available content
   */
  private generateOverviewSections(): RecipeSection[] {
    const sections: RecipeSection[] = [];
    const configs = this.getOverviewSectionConfigs();

    // Iterate through configuration and add visible sections
    for (const config of configs) {
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
   * Uses caching to avoid redundant calculations on every call
   */
  getVisibleOverviewSections() {
    // Return cached result if recipe hasn't changed
    if (this.cachedRecipeId === this.currentRecipe?.id && this.cachedOverviewSections) {
      return this.cachedOverviewSections;
    }

    // Calculate visible sections
    const configs = this.getOverviewSectionConfigs();
    const result = configs.filter(config =>
      config.alwaysShow || (config.isVisible && config.isVisible())
    ).map(config => ({
      ...config,
      data: config.getData ? config.getData() : null
    }));

    // Cache the result
    this.cachedRecipeId = this.currentRecipe?.id;
    this.cachedOverviewSections = result;

    return result;
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
          elementId: `step-${index}`
        });
      });
    }
    return sections;
  }

  /**
   * Get overview sections for TOC display
   */
  getOverviewSectionsForTOC(): RecipeSection[] {
    return this.generateOverviewSections();
  }

  /**
   * Get walkthrough sections for TOC display
   */
  getWalkthroughSectionsForTOC(): RecipeSection[] {
    return this.generateWalkthroughSections();
  }

  /**
   * Build correct asset path for recipe files
   */
  buildAssetPath(filePath: string): string {
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

    // Build the correct absolute assets path: /assets/recipes/{recipeSlug}/{filePath}
    // Replace em dash and other dash characters with underscore to match actual folder names
    // Use slug (folder name) instead of id (UUID) to match actual asset directory structure
    const normalizedSlug = (this.currentRecipe.slug || this.currentRecipe.id)
      .replace(/[\u2010-\u2015]/g, '_');
    return `/assets/recipes/${normalizedSlug}/${filePath}`;
  }

  // ==================== Validation Methods ====================

  /**
   * Private helper to validate if a string has content
   */
  private hasValidString(value: string | undefined): boolean {
    return !!(value && value.trim().length > 0);
  }

  /**
   * Check if current recipe has valid overview
   */
  hasValidOverview(): boolean {
    return this.hasValidString(this.currentRecipe?.overview);
  }

  /**
   * Check if current recipe has valid when to use
   */
  hasValidWhenToUse(): boolean {
    return this.hasValidString(this.currentRecipe?.whenToUse);
  }

  /**
   * Check if prerequisites array has valid content
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
   * Check if current recipe has valid related recipes
   */
  hasValidRelatedRecipes(): boolean {
    const related = this.currentRecipe?.relatedRecipes;
    return !!(related && related.length > 0 &&
              related.some(recipe => recipe.title && recipe.title.trim().length > 0 &&
                                    recipe.url && recipe.url.trim().length > 0));
  }

  // ==================== Data Retrieval Methods ====================

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
          usingPermissions.push(prereq.description);
        }
      });
    }

    return usingPermissions;
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

  /**
   * Get all sections (overview + walkthrough) for unified rendering
   * Returns sections with data and metadata for RecipeSectionComponent
   * This method supports the unified component architecture
   */
  getAllSectionsForRendering(): any[] {
    const sections: any[] = [];

    // Add all visible overview sections
    const overviewSections = this.getVisibleOverviewSections();
    sections.push(...overviewSections);

    // Add all walkthrough steps as sections
    const walkthrough = this.currentRecipe?.walkthrough;
    if (Array.isArray(walkthrough)) {
      walkthrough.forEach((step, index) => {
        sections.push({
          id: `step-${index}`,
          title: step.step || `Step ${index + 1}`,
          elementId: `step-${index}`,
          contentType: 'walkthrough-step',
          isVisible: () => true,
          getData: () => step,
          data: step,
          stepIndex: index
        });
      });
    }

    return sections;
  }
}
