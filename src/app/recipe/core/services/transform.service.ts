import { Injectable } from '@angular/core';
import { generateSlug } from '../../../shared/utils/slug.utils';
import { RecipeData, Recipe, WalkthroughStep } from '../models/recipe.model';
import { RECIPE_PATHS } from '../constants/recipe.constants';

interface RecipeDataWithMetadata extends RecipeData {
  __folderId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransformService {

  transformRecipeRecords(records: RecipeData[]): Recipe[] {
    return records.map(record => this.transformSingleRecord(record));
  }

  transformSingleRecord(record: RecipeData): Recipe {
    const metadata = record as RecipeDataWithMetadata;
    const folderId = metadata.__folderId || record.id;

    return {
      id: record.id,
      title: record.title,
      slug: generateSlug(record.title),
      category: record.category,
      DSPVersions: record.DSPVersions || [],

      overview: record.overview || '',
      whenToUse: record.whenToUse || '',
      direction: record.direction || '',
      connection: record.connection || '',

      generalImages: record.generalImages || [],
      prerequisites: record.prerequisites || [],
      walkthrough: this.processWalkthroughImagePaths(
        record.walkthrough || [],
        folderId
      ),
      downloadableExecutables: this.processDownloadableExecutables(
        record.downloadableExecutables || [],
        folderId
      ),
      relatedRecipes: record.relatedRecipes || [],
      keywords: record.keywords || [],

      isExpanded: false,
      isLoading: false,
      showSocialShare: false
    };
  }

  private processWalkthroughImagePaths(walkthrough: WalkthroughStep[], folderId: string): WalkthroughStep[] {
    return walkthrough.map(step => {
      if (step.media && Array.isArray(step.media)) {
        step.media = step.media.map(media => {
          if (media.type === 'image' && media.url && media.url.startsWith('images/')) {
            return {
              ...media,
              url: `${RECIPE_PATHS.RECIPE_FOLDERS_BASE}${folderId}/${media.url}`
            };
          }
          return media;
        });
      }
      return step;
    });
  }

  private processDownloadableExecutables(executables: any[], folderId: string): any[] {
    if (!executables || !Array.isArray(executables)) {
      return [];
    }

    return executables.map(executable => {
      if (executable.filePath &&
          !executable.filePath.startsWith('http') &&
          !executable.filePath.startsWith('/')) {
        return {
          ...executable,
          filePath: `${RECIPE_PATHS.RECIPE_FOLDERS_BASE}${folderId}/${executable.filePath}`
        };
      }
      return executable;
    });
  }

}
