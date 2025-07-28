import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { RecipeWalkthroughStep, RecipeStepConfig, RecipeStepMedia } from '../../shared/models/recipe.model';

@Component({
  selector: 'app-recipe-step',
  template: `
    <div class="recipe-step-container">
      <!-- Step Content -->
      <div class="step-main-content">
        <ng-container [ngSwitch]="stepType">
          <!-- Custom Step (New Format) -->
          <div *ngSwitchCase="'custom'" class="custom-step">
            <div class="step-description">
              <h3>{{ stepData.step }}</h3>
            </div>
            
            <div class="step-content">
              <!-- Configuration Fields -->
              <div class="config-section" *ngIf="stepData.config?.length">
                <h4>Configuration</h4>
                <div class="config-fields">
                  <div class="field-group" *ngFor="let config of stepData.config">
                    <label>{{ config.field }}:</label>
                    <span class="field-value">{{ config.value }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Media Content -->
              <div class="media-section" *ngIf="stepData.media?.length">
                <h4>Media & Resources</h4>
                <div class="media-content">
                  <div class="media-item" *ngFor="let media of stepData.media">
                    <div [ngSwitch]="media.type">
                      <!-- Image -->
                      <div *ngSwitchCase="'image'" class="media-image">
                        <img [src]="media.url" [alt]="media.alt" class="responsive-image">
                        <p class="media-caption" *ngIf="media.alt">{{ media.alt }}</p>
                      </div>
                      
                      <!-- Video -->
                      <div *ngSwitchCase="'video'" class="media-video">
                        <video controls class="responsive-video">
                          <source [src]="media.url" type="video/mp4">
                          Your browser does not support the video tag.
                        </video>
                        <p class="media-caption" *ngIf="media.alt">{{ media.alt }}</p>
                      </div>
                      
                      <!-- Link -->
                      <div *ngSwitchCase="'link'" class="media-link">
                        <a [href]="media.url" target="_blank" class="external-link">
                          <mat-icon>link</mat-icon>
                          {{ media.alt || media.url }}
                        </a>
                      </div>
                      
                      <!-- Document -->
                      <div *ngSwitchCase="'document'" class="media-document">
                        <a [href]="media.url" target="_blank" class="document-link">
                          <mat-icon>description</mat-icon>
                          {{ media.alt || 'Download Document' }}
                        </a>
                      </div>
                      
                      <!-- Default -->
                      <div *ngSwitchDefault class="media-default">
                        <a [href]="media.url" target="_blank">
                          {{ media.alt || media.url }}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Create Executable Step -->
          <div *ngSwitchCase="'createExecutable'" class="create-executable-step">
            <div class="step-description">
              <p class="instructions">{{ stepData.instructions }}</p>
            </div>
            
            <div class="step-content">
              <h4>Configuration Details</h4>
              <div class="config-fields">
                <div class="field-group">
                  <label>Source Object API Name:</label>
                  <span class="field-value">{{ stepData.sourceObjectApiName }}</span>
                </div>
                <div class="field-group">
                  <label>Target Object API Name:</label>
                  <span class="field-value">{{ stepData.targetObjectApiName }}</span>
                </div>
                <div class="field-group">
                  <label>Source Matching Field:</label>
                  <span class="field-value">{{ stepData.sourceMatchingField }}</span>
                </div>
                <div class="field-group">
                  <label>Target Matching Field:</label>
                  <span class="field-value">{{ stepData.targetMatchingField }}</span>
                </div>
                <div class="field-group">
                  <label>Action:</label>
                  <span class="field-value action-type">{{ stepData.action }}</span>
                </div>
                <div class="field-group">
                  <label>Executable Name:</label>
                  <span class="field-value executable-name">{{ stepData.executableName }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Retrieve Step -->
          <div *ngSwitchCase="'retrieve'" class="retrieve-step">
            <div class="step-description">
              <p class="instructions">{{ stepData.instructions }}</p>
            </div>
            
            <div class="step-content">
              <h4>SOQL Queries</h4>
              <div *ngFor="let query of stepData.soqlQueries" class="query-example">
                <h5>{{ query.title }}</h5>
                <app-code-highlight [code]="query.code" [language]="query.language">
                </app-code-highlight>
                <p class="query-description">{{ query.description }}</p>
              </div>
            </div>
          </div>

          <!-- Scoping Step -->
          <div *ngSwitchCase="'scoping'" class="scoping-step">
            <div class="step-description">
              <p class="instructions">{{ stepData.instructions }}</p>
            </div>
            
            <div class="step-content">
              <h4>Scope Configuration</h4>
              <div class="scope-config">
                <div class="config-item">
                  <label>Filter Setup:</label>
                  <div class="config-value">{{ stepData.scopeFilterSetup }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Match Step -->
          <div *ngSwitchCase="'match'" class="match-step">
            <div class="step-description">
              <p class="instructions">{{ stepData.instructions }}</p>
            </div>
            
            <div class="step-content">
              <h4>Matching Configuration</h4>
              <div class="match-config">
                <div class="config-item">
                  <label>Matching Logic:</label>
                  <div class="config-value">{{ stepData.matchingLogic }}</div>
                </div>
                <div class="config-item">
                  <label>Rules:</label>
                  <div class="config-value">{{ stepData.rules }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mapping Step -->
          <div *ngSwitchCase="'mapping'" class="mapping-step">
            <div class="step-description">
              <p class="instructions">{{ stepData.instructions }}</p>
            </div>
            
            <div class="step-content">
              <h4>Field Mapping</h4>
              <div class="mapping-config">
                <pre class="mapping-display">{{ stepData.fieldMappingConfig }}</pre>
              </div>
            </div>
          </div>

          <!-- Action Step -->
          <div *ngSwitchCase="'action'" class="action-step">
            <div class="step-description">
              <p class="instructions">{{ stepData.instructions }}</p>
            </div>
            
            <div class="step-content">
              <h4>Action Configuration</h4>
              <div class="action-config">
                <div class="config-item">
                  <label>Configuration:</label>
                  <div class="config-value">{{ stepData.actionConfiguration }}</div>
                </div>
                <div class="config-item" *ngIf="stepData.options">
                  <label>Options:</label>
                  <div class="config-value">{{ stepData.options }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Verify Step -->
          <div *ngSwitchCase="'verify'" class="verify-step">
            <div class="step-description">
              <p class="instructions">{{ stepData.instructions }}</p>
            </div>
            
            <div class="step-content">
              <h4>Verification Queries</h4>
              <div *ngFor="let query of stepData.verificationQueries" class="query-example">
                <h5>{{ query.title }}</h5>
                <app-code-highlight [code]="query.code" [language]="query.language">
                </app-code-highlight>
                <p class="query-description">{{ query.description }}</p>
              </div>
            </div>
          </div>

          <!-- Preview Transformed Step -->
          <div *ngSwitchCase="'previewTransformed'" class="preview-step">
            <div class="step-description">
              <p class="instructions">{{ stepData.previewInstructions }}</p>
            </div>
            
            <div class="step-content">
              <h4>Expected Results</h4>
              <div class="preview-content">
                <p>{{ stepData.expectedResults }}</p>
              </div>
            </div>
          </div>

          <!-- Add Schedule Step -->
          <div *ngSwitchCase="'addSchedule'" class="schedule-step">
            <div class="step-description">
              <p class="instructions">{{ stepData.setupGuide }}</p>
            </div>
            
            <div class="step-content">
              <h4>Scheduling Configuration</h4>
              <div class="schedule-config">
                <div class="config-item">
                  <label>Schedule:</label>
                  <div class="config-value">{{ stepData.schedulingConfig }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Default case for other steps -->
          <div *ngSwitchDefault class="default-step">
            <div class="step-description">
              <p class="instructions">Configuration step details:</p>
            </div>
            
            <div class="step-content">
              <h4>Step Data</h4>
              <pre class="step-data">{{ stepData | json }}</pre>
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .recipe-step-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .step-main-content {
      margin-bottom: 32px;
    }

    .step-description {
      margin-bottom: 24px;
    }

    .instructions {
      font-size: 16px;
      line-height: 1.6;
      color: #333;
      margin: 0;
    }

    .step-content {
      width: 100%;
    }

    .step-content h4 {
      color: #1976d2;
      margin-bottom: 16px;
      font-weight: 500;
    }

    .config-fields, .config-item, .action-config, .match-config, .scope-config, .schedule-config {
      margin-bottom: 16px;
    }

    .field-group, .config-item {
      display: flex;
      margin-bottom: 12px;
      align-items: flex-start;
    }

    .field-group label, .config-item label {
      font-weight: 500;
      min-width: 180px;
      color: #555;
      margin-right: 12px;
    }

    .field-value, .config-value {
      background: #f5f5f5;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      flex: 1;
      word-break: break-word;
    }

    .action-type {
      background: #e3f2fd;
      color: #1976d2;
      font-weight: 500;
    }

    .executable-name {
      background: #f3e5f5;
      color: #7b1fa2;
      font-weight: 500;
    }

    .query-example, .code-example {
      margin-bottom: 24px;
    }

    .query-example h5 {
      color: #2e7d32;
      margin-bottom: 8px;
    }

    .query-description {
      font-style: italic;
      color: #666;
      margin-top: 8px;
    }

    .mapping-display, .step-data {
      background: #f8f8f8;
      padding: 16px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.4;
      white-space: pre-wrap;
      overflow-x: auto;
    }


    .preview-content {
      background: #fff3e0;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #ff9800;
    }
    
    .custom-step {
      margin-bottom: 24px;
    }
    
    .custom-step .step-description h3 {
      color: #1976d2;
      font-size: 1.5rem;
      margin-bottom: 16px;
    }
    
    .config-section {
      margin-bottom: 24px;
    }
    
    .media-section {
      margin-bottom: 24px;
    }
    
    .media-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .media-item {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }
    
    .media-image {
      text-align: center;
    }
    
    .responsive-image {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .responsive-video {
      width: 100%;
      max-width: 600px;
      height: auto;
      border-radius: 4px;
    }
    
    .media-caption {
      margin-top: 8px;
      font-style: italic;
      color: #666;
      text-align: center;
    }
    
    .media-link, .media-document {
      display: flex;
      align-items: center;
    }
    
    .external-link, .document-link {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1976d2;
      text-decoration: none;
      font-weight: 500;
      padding: 8px 16px;
      background: #e3f2fd;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    
    .external-link:hover, .document-link:hover {
      background: #bbdefb;
      text-decoration: none;
    }
    
    .media-default a {
      color: #1976d2;
      text-decoration: none;
    }
    
    .media-default a:hover {
      text-decoration: underline;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeStepComponent {
  @Input() stepData: any;
  @Input() stepType: string = '';
}