import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RecipeExecutable } from '../../shared/models/recipe.model';

@Component({
  selector: 'app-recipe-download',
  template: `
    <div class="recipe-download">
      <mat-card>
        <mat-card-header>
          <div mat-card-avatar>
            <mat-icon>download</mat-icon>
          </div>
          <mat-card-title>{{ executable.fileName }}</mat-card-title>
          <mat-card-subtitle>Version {{ executable.version }}</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <p>{{ executable.description }}</p>
          <div class="download-info">
            <span *ngIf="executable.fileSize">Size: {{ executable.fileSize }}</span>
            <span *ngIf="executable.downloadCount">Downloads: {{ executable.downloadCount }}</span>
          </div>
        </mat-card-content>
        
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="downloadFile()">
            <mat-icon>download</mat-icon>
            Download Executable
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .recipe-download {
      max-width: 500px;
    }
    
    .download-info {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-top: 1rem;
    }
    
    mat-card-actions button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeDownloadComponent {
  @Input() executable!: RecipeExecutable;

  downloadFile(): void {
    // Implement file download logic
    window.open(this.executable.filePath, '_blank');
  }
}