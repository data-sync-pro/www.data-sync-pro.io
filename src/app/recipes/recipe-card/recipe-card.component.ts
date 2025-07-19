import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy 
} from '@angular/core';
import { RecipeItem } from '../../shared/models/recipe.model';

@Component({
  selector: 'app-recipe-card',
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeCardComponent {
  @Input() recipe!: RecipeItem;
  @Input() highlightSearchTerms = false;
  @Input() searchQuery = '';
  
  @Output() recipeSelect = new EventEmitter<RecipeItem>();

  /**
   * Handle recipe card click
   */
  onRecipeClick(): void {
    this.recipeSelect.emit(this.recipe);
  }

  /**
   * Get difficulty badge color
   */
  getDifficultyColor(): string {
    switch (this.recipe.difficulty) {
      case 'beginner': return 'accent';
      case 'intermediate': return 'primary';
      case 'advanced': return 'warn';
      default: return 'primary';
    }
  }

  /**
   * Get category icon
   */
  getCategoryIcon(): string {
    switch (this.recipe.category) {
      case 'action-button': return 'smart_button';
      case 'batch': return 'layers';
      case 'data-list': return 'list_alt';
      case 'data-loader': return 'upload_file';
      case 'triggers': return 'bolt';
      default: return 'description';
    }
  }

  /**
   * Get estimated time display
   */
  getTimeDisplay(): string {
    const time = this.recipe.estimatedTime;
    if (time < 60) {
      return `${time} min`;
    } else {
      const hours = Math.floor(time / 60);
      const minutes = time % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }

  /**
   * Get recipe description with highlighting if search is active
   */
  getDisplayDescription(): string {
    if (this.highlightSearchTerms && this.searchQuery) {
      return this.highlightKeywords(this.recipe.description, [this.searchQuery]);
    }
    return this.recipe.description;
  }

  /**
   * Get recipe title with highlighting if search is active
   */
  getDisplayTitle(): string {
    if (this.highlightSearchTerms && this.searchQuery) {
      return this.highlightKeywords(this.recipe.title, [this.searchQuery]);
    }
    return this.recipe.title;
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
   * Get progress percentage
   */
  getProgressPercentage(): number {
    if (!this.recipe.completedSteps || this.recipe.completedSteps.length === 0) {
      return 0;
    }
    // Assuming 9 total steps in a recipe walkthrough
    const totalSteps = 9;
    return Math.round((this.recipe.completedSteps.length / totalSteps) * 100);
  }
}