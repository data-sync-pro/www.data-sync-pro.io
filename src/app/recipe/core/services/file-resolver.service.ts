import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RecipeData } from '../models/recipe.model';
import { FileStorageAdapter } from '../storage';
import { LoggerService } from './logger.service';

export interface RecipeDataWithMetadata extends RecipeData {
  __folderId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileResolverService {

  constructor(
    private http: HttpClient,
    private logger: LoggerService
  ) {}

  async fetchOriginalFile(filePath: string): Promise<File | null> {
    try {
      const response = await firstValueFrom(this.http.get(filePath, { responseType: 'blob' }));
      const filename = filePath.split('/').pop() || 'file';
      const file = new File([response], filename, {
        type: response.type || 'application/octet-stream'
      });

      return file;
    } catch (error) {
      this.logger.warn(`Failed to fetch original file ${filePath}`, error);
      return null;
    }
  }

  getFolderIdForRecipe(recipe: RecipeDataWithMetadata): string {
    if (recipe.__folderId) {
      return recipe.__folderId;
    }

    const idToFolderMap: { [key: string]: string } = {
      'auto‑close-stagnant-cases': 'auto_close-stagnant-cases'
    };

    return idToFolderMap[recipe.id] || recipe.id;
  }

  async getFileWithFallback(
    fileStorage: FileStorageAdapter,
    fileId: string,
    recipe: RecipeDataWithMetadata,
    relativePath: string,
    isImage: boolean = true
  ): Promise<File | null> {
    try {
      const indexedFile = isImage
        ? await fileStorage.getImage(fileId)
        : await fileStorage.getJsonFile(fileId);

      if (indexedFile) {
        this.logger.debug(`Retrieved ${isImage ? 'image' : 'JSON'} from IndexedDB: ${fileId}`);
        return indexedFile;
      }

      const folderId = this.getFolderIdForRecipe(recipe);
      const originalPath = `assets/recipes/${folderId}/${relativePath}`;

      this.logger.debug(`Falling back to original file: ${originalPath}`);
      return await this.fetchOriginalFile(originalPath);
    } catch (error) {
      this.logger.warn(`Failed to get file ${fileId} / ${relativePath}`, error);
      return null;
    }
  }

  extractImageId(imageName: string): string {
    // Remove file extension first
    const nameWithoutExt = imageName.replace(/\.[^/.]+$/, '');

    // Handle old format with underscores (e.g., img_timestamp_random)
    const parts = nameWithoutExt.split('_');
    if (parts.length >= 3) {
      return parts[0] + '_' + parts[1] + '_' + parts[2];
    }

    // Handle new format with dashes (e.g., step-0-image-timestamp)
    // or general-image-timestamp - just return without extension
    return nameWithoutExt;
  }

  getImageMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'svg': return 'image/svg+xml';
      default: return 'image/png';
    }
  }

  buildRecipeAssetPath(recipe: RecipeDataWithMetadata, relativePath: string): string {
    const folderId = this.getFolderIdForRecipe(recipe);
    return `assets/recipes/${folderId}/${relativePath}`;
  }

  async fileExistsInStorage(
    fileStorage: FileStorageAdapter,
    fileId: string,
    isImage: boolean = true
  ): Promise<boolean> {
    try {
      const file = isImage
        ? await fileStorage.getImage(fileId)
        : await fileStorage.getJsonFile(fileId);
      return file !== null;
    } catch (error) {
      return false;
    }
  }
}
