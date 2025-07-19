import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-recipe-step',
  template: `
    <div class="recipe-step">
      <div class="step-content">
        <ng-container [ngSwitch]="stepType">
          <!-- Create Executable Step -->
          <div *ngSwitchCase="'createExecutable'" class="create-executable-step">
            <p>{{ stepData.instructions }}</p>
            <div class="form-fields">
              <div class="field-group">
                <label>Source Object API Name:</label>
                <span>{{ stepData.sourceObjectApiName }}</span>
              </div>
              <div class="field-group">
                <label>Target Object API Name:</label>
                <span>{{ stepData.targetObjectApiName }}</span>
              </div>
              <div class="field-group">
                <label>Action:</label>
                <span>{{ stepData.action }}</span>
              </div>
            </div>
          </div>
          
          <!-- Retrieve Step -->
          <div *ngSwitchCase="'retrieve'" class="retrieve-step">
            <p>{{ stepData.instructions }}</p>
            <div *ngFor="let query of stepData.soqlQueries" class="code-example">
              <h4>{{ query.title }}</h4>
              <app-code-highlight [code]="query.code" [language]="query.language">
              </app-code-highlight>
              <p>{{ query.description }}</p>
            </div>
          </div>
          
          <!-- Default case for other steps -->
          <div *ngSwitchDefault class="default-step">
            <pre>{{ stepData | json }}</pre>
          </div>
        </ng-container>
      </div>
      
      <div class="step-actions">
        <button mat-raised-button color="primary" (click)="markComplete()">
          Mark as Complete
        </button>
      </div>
    </div>
  `,
  styles: [`
    .recipe-step {
      padding: 1rem;
    }
    
    .form-fields {
      margin: 1rem 0;
    }
    
    .field-group {
      margin: 0.5rem 0;
    }
    
    .field-group label {
      font-weight: 600;
      margin-right: 0.5rem;
    }
    
    .code-example {
      margin: 1rem 0;
    }
    
    .step-actions {
      margin-top: 1rem;
      text-align: right;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeStepComponent {
  @Input() stepData: any;
  @Input() stepType!: string;
  
  @Output() stepComplete = new EventEmitter<void>();

  markComplete(): void {
    this.stepComplete.emit();
  }
}