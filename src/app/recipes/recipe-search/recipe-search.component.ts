import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-recipe-search',
  template: `
    <div class="recipe-search">
      <mat-form-field class="search-field" appearance="outline">
        <mat-label>Search recipes...</mat-label>
        <input matInput 
               type="text" 
               [value]="searchQuery"
               (input)="onSearchInput($event)"
               placeholder="Enter keywords, category, or difficulty"
               #searchInput>
        <mat-icon matPrefix>search</mat-icon>
        <button *ngIf="searchQuery" 
                mat-icon-button 
                matSuffix 
                (click)="onClearSearch()"
                aria-label="Clear search">
          <mat-icon>close</mat-icon>
        </button>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .recipe-search {
      width: 100%;
    }
    
    .search-field {
      width: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeSearchComponent {
  @Input() searchQuery = '';
  
  @Output() searchChange = new EventEmitter<string>();
  @Output() searchClear = new EventEmitter<void>();

  onSearchInput(event: any): void {
    this.searchChange.emit(event.target.value);
  }

  onClearSearch(): void {
    this.searchClear.emit();
  }
}