export interface RecipeIndexEntry {
  folderId: string;
  active: boolean;
}

export interface IOProgress {
  step: string;
  current: number;
  total: number;
}

export type ProgressCallback = (progress: IOProgress) => void;
