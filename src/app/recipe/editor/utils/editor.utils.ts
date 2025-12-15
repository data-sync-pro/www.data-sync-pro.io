import { RecipeData, Recipe } from '../../core/models/recipe.model';

export class EditorUtils {

  static truncateTitle(title: string, maxLength: number): string {
    if (!title) return '';
    return title.length > maxLength
      ? title.substring(0, maxLength) + '...'
      : title;
  }

  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static generateRecipeId(title?: string): string {
    if (title) {
      const baseId = title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .substring(0, 30);

      const suffix = Math.random().toString(36).substring(2, 6);
      return `${baseId}-${suffix}`;
    }

    return this.generateUUID();
  }

  static createEmptyRecipe(): RecipeData {
    return {
      id: this.generateRecipeId(),
      title: 'New Recipe',
      category: 'General',
      DSPVersions: [],
      overview: '',
      generalUseCase: '',
      generalImages: [],
      prerequisites: [],
      pipeline: '',
      direction: '',
      connection: '',
      walkthrough: [],
      verificationGIF: [],
      downloadableExecutables: [],
      relatedRecipes: [],
      keywords: []
    };
  }

  static convertToSourceRecord(recipe: Recipe): RecipeData {
    return {
      id: recipe.id,
      title: recipe.title,
      category: recipe.category,
      DSPVersions: recipe.DSPVersions,
      overview: recipe.overview,
      generalUseCase: recipe.generalUseCase,
      generalImages: recipe.generalImages,
      prerequisites: recipe.prerequisites,
      pipeline: recipe.pipeline,
      direction: recipe.direction,
      connection: recipe.connection,
      walkthrough: recipe.walkthrough,
      verificationGIF: recipe.verificationGIF,
      downloadableExecutables: recipe.downloadableExecutables,
      relatedRecipes: recipe.relatedRecipes,
      keywords: recipe.keywords
    };
  }

  static clearTimeoutSafely(timeout: any): void {
    if (timeout) {
      clearTimeout(timeout);
    }
  }

  static hasContent(recipe: RecipeData): boolean {
    return !!(
      recipe.title ||
      recipe.overview ||
      recipe.generalUseCase ||
      (recipe.walkthrough && recipe.walkthrough.length > 0) ||
      (recipe.generalImages && recipe.generalImages.length > 0)
    );
  }
}
