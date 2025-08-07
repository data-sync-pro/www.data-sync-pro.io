const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RECIPES_JSON_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "data",
  "recipes.json"
);

const RECIPES_COMPONENT_PATH = path.join(
  __dirname,
  "..",
  "app",
  "recipes"
);

/**
 * Convert recipe name to kebab-case for component naming
 */
function toKebabCase(recipeName) {
  return recipeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Create recipe detail component for a specific recipe
 */
function createRecipeDetailComponent(recipe) {
  const { id, name, title, category } = recipe;
  const componentName = `${toKebabCase(name)}-detail`;
  const componentPath = path.join(RECIPES_COMPONENT_PATH, "recipe-details", componentName);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(path.dirname(componentPath))) {
    fs.mkdirSync(path.dirname(componentPath), { recursive: true });
  }

  const generateCmd = `ng generate component recipes/recipe-details/${componentName} \
    --flat=false \
    --skip-tests \
    --inline-style=false \
    --inline-template=false`;

  console.log(`\n--- Generating recipe detail component for: "${title}"`);
  console.log(`CLI Command: ${generateCmd}`);

  try {
    execSync(generateCmd, { stdio: "inherit" });
  } catch (error) {
    console.error(`Failed to generate component for ${title}:`, error.message);
    return false;
  }

  // Generate component HTML template
  const htmlTemplate = generateHTMLTemplate(recipe);
  const htmlFilePath = path.join(componentPath, `${componentName}.component.html`);
  
  try {
    fs.writeFileSync(htmlFilePath, htmlTemplate);
    console.log(`Generated HTML template: ${htmlFilePath}`);
  } catch (error) {
    console.error(`Failed to write HTML template:`, error.message);
  }

  // Generate component TypeScript file
  const tsTemplate = generateTSTemplate(recipe, componentName);
  const tsFilePath = path.join(componentPath, `${componentName}.component.ts`);
  
  try {
    fs.writeFileSync(tsFilePath, tsTemplate);
    console.log(`Generated TypeScript component: ${tsFilePath}`);
  } catch (error) {
    console.error(`Failed to write TypeScript component:`, error.message);
  }

  // Generate component SCSS file
  const scssTemplate = generateSCSSTemplate(recipe);
  const scssFilePath = path.join(componentPath, `${componentName}.component.scss`);
  
  try {
    fs.writeFileSync(scssFilePath, scssTemplate);
    console.log(`Generated SCSS styles: ${scssFilePath}`);
  } catch (error) {
    console.error(`Failed to write SCSS styles:`, error.message);
  }

  return true;
}

/**
 * Generate HTML template for recipe detail component
 */
function generateHTMLTemplate(recipe) {
  return `<!-- Auto-generated recipe detail component for: ${recipe.title} -->
<div class="recipe-detail-${toKebabCase(recipe.name)}">
  
  <!-- Recipe Header -->
  <div class="recipe-header">
    <div class="header-content">
      <h1 class="recipe-title">{{ recipe.title }}</h1>
      <div class="recipe-meta">
        <span class="category-tag">{{ recipe.category | titlecase }}</span>
      </div>
    </div>
  </div>

  <!-- Recipe Content -->
  <div class="recipe-content">
    
    <!-- Use Case Section -->
    <section class="use-case-section">
      <h2>Use Case</h2>
      <div class="use-case-content" [innerHTML]="recipe.safeUseCase"></div>
    </section>

    <!-- Prerequisites Section -->
    <section class="prerequisites-section">
      <h2>Prerequisites</h2>
      
      <div class="permissions-grid">
        <div class="permission-group">
          <h3>For Building</h3>
          <ul class="permission-list">
            <li *ngFor="let permission of recipe.prerequisites.permissionSetsForBuilding">
              <mat-icon>check_circle</mat-icon>
              {{ permission }}
            </li>
          </ul>
        </div>
        
        <div class="permission-group">
          <h3>For Using</h3>
          <ul class="permission-list">
            <li *ngFor="let permission of recipe.prerequisites.permissionSetsForUsing">
              <mat-icon>check_circle</mat-icon>
              {{ permission }}
            </li>
          </ul>
        </div>
      </div>
      
      <div class="directions-content">
        <h3>Setup Instructions</h3>
        <div [innerHTML]="recipe.prerequisites.safeDirections"></div>
      </div>
    </section>

    <!-- Walkthrough Section -->
    <section class="walkthrough-section">
      <h2>Step-by-Step Walkthrough</h2>
      
      <mat-stepper orientation="vertical" #stepper>
        
        <!-- Step 1: Create Executable -->
        <mat-step label="Create Executable" [completed]="isStepCompleted(1)">
          <div class="step-content">
            <p>{{ recipe.walkthrough.createExecutable.instructions }}</p>
            <div class="form-fields">
              <div class="field-row">
                <label>1. Source Object:</label>
                <code>{{ recipe.walkthrough.createExecutable.sourceObjectApiName }}</code>
              </div>
              <div class="field-row">
                <label>2. Target Object:</label>
                <code>{{ recipe.walkthrough.createExecutable.targetObjectApiName }}</code>
              </div>
              <div class="field-row">
                <label>3. Matching Field (Source):</label>
                <code>{{ recipe.walkthrough.createExecutable.sourceMatchingField }}</code>
              </div>
              <div class="field-row">
                <label>4. Matching Field (Target):</label>
                <code>{{ recipe.walkthrough.createExecutable.targetMatchingField }}</code>
              </div>
              <div class="field-row">
                <label>5. Action:</label>
                <code>{{ recipe.walkthrough.createExecutable.action }}</code>
              </div>
              <div class="field-row">
                <label>6. Executable Name:</label>
                <code>{{ recipe.walkthrough.createExecutable.executableName }}</code>
              </div>
            </div>
          </div>
          <div class="step-actions">
            <button mat-raised-button color="primary" (click)="completeStep(1)">
              Mark Complete
            </button>
            <button mat-button matStepperNext>Next</button>
          </div>
        </mat-step>

        <!-- Step 2: Retrieve Data -->
        <mat-step label="Retrieve Data" [completed]="isStepCompleted(2)">
          <div class="step-content">
            <p>{{ recipe.walkthrough.retrieve.instructions }}</p>
            <div *ngFor="let query of recipe.walkthrough.retrieve.soqlQueries" class="code-example">
              <h4>{{ query.title }}</h4>
              <app-code-highlight 
                [code]="query.code" 
                [language]="query.language"
                [title]="query.title">
              </app-code-highlight>
              <p *ngIf="query.description">{{ query.description }}</p>
            </div>
          </div>
          <div class="step-actions">
            <button mat-raised-button color="primary" (click)="completeStep(2)">
              Mark Complete
            </button>
            <button mat-button matStepperPrevious>Back</button>
            <button mat-button matStepperNext>Next</button>
          </div>
        </mat-step>

        <!-- Additional steps would be generated similarly -->
        <!-- ... -->
        
      </mat-stepper>
    </section>

    <!-- Download Section -->
    <section class="download-section" *ngIf="recipe.downloadableExecutable">
      <h2>Download Executable</h2>
      <app-recipe-download [executable]="recipe.downloadableExecutable"></app-recipe-download>
    </section>

  </div>
</div>`;
}

/**
 * Generate TypeScript component template
 */
function generateTSTemplate(recipe, componentName) {
  const className = componentName
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') + 'Component';

  return `import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RecipeItem } from '../../../shared/models/recipe.model';

@Component({
  selector: 'app-${componentName}',
  templateUrl: './${componentName}.component.html',
  styleUrls: ['./${componentName}.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ${className} implements OnInit {
  @Input() recipe!: RecipeItem;
  
  private completedSteps: Set<number> = new Set();

  ngOnInit(): void {
    // Load any existing progress for this recipe
    this.loadRecipeProgress();
  }

  /**
   * Check if a step is completed
   */
  isStepCompleted(stepNumber: number): boolean {
    return this.completedSteps.has(stepNumber);
  }

  /**
   * Mark a step as completed
   */
  completeStep(stepNumber: number): void {
    this.completedSteps.add(stepNumber);
    this.saveRecipeProgress();
  }


  /**
   * Load recipe progress from localStorage
   */
  private loadRecipeProgress(): void {
    const key = \`recipe-progress-\${this.recipe?.id}\`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const progress = JSON.parse(stored);
        this.completedSteps = new Set(progress.completedSteps || []);
      } catch (error) {
        console.warn('Failed to load recipe progress:', error);
      }
    }
  }

  /**
   * Save recipe progress to localStorage
   */
  private saveRecipeProgress(): void {
    const key = \`recipe-progress-\${this.recipe?.id}\`;
    const progress = {
      recipeId: this.recipe?.id,
      completedSteps: Array.from(this.completedSteps),
      lastUpdated: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(key, JSON.stringify(progress));
    } catch (error) {
      console.warn('Failed to save recipe progress:', error);
    }
  }
}`;
}

/**
 * Generate SCSS styles template
 */
function generateSCSSTemplate(recipe) {
  return `@import '../../../../styles/variables';
@import '../../../../styles/mixins';

.recipe-detail-${toKebabCase(recipe.name)} {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;

  @include mobile {
    padding: 1rem;
  }
}

// Header
.recipe-header {
  margin-bottom: 3rem;
  
  .recipe-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 1rem;
    
    @include mobile {
      font-size: 2rem;
    }
  }
  
  .recipe-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  
  
  .category-tag {
    background: var(--surface-color);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-muted);
  }
}

// Content Sections
.recipe-content {
  section {
    margin-bottom: 3rem;
    
    h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--primary-color);
      margin-bottom: 1.5rem;
      border-bottom: 2px solid var(--primary-color);
      padding-bottom: 0.5rem;
    }
    
    h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-color);
      margin: 1.5rem 0 1rem 0;
    }
  }
}

// Use Case Section
.use-case-section {
  .use-case-content {
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--text-color);
    background: var(--surface-color);
    padding: 1.5rem;
    border-radius: 8px;
    border-left: 4px solid var(--primary-color);
  }
}

// Prerequisites Section
.permissions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
  
  @include mobile {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

.permission-group {
  background: var(--surface-color);
  padding: 1.5rem;
  border-radius: 8px;
  
  h3 {
    margin-top: 0;
    color: var(--primary-color);
  }
}

.permission-list {
  list-style: none;
  padding: 0;
  margin: 0;
  
  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
    
    &:last-child {
      border-bottom: none;
    }
    
    mat-icon {
      color: var(--success-color);
      font-size: 1.2rem;
    }
  }
}

.directions-content {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

// Walkthrough Section
.walkthrough-section {
  .mat-stepper-vertical {
    background: transparent;
  }
  
  .step-content {
    padding: 1rem 0;
    
    p {
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 1rem;
    }
  }
  
  .form-fields {
    background: var(--surface-color);
    padding: 1.5rem;
    border-radius: 8px;
    margin: 1rem 0;
  }
  
  .field-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
    
    @include mobile {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
    
    label {
      font-weight: 600;
      min-width: 150px;
      color: var(--text-color);
    }
    
    code {
      background: var(--background-color);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      border: 1px solid var(--border-color);
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      color: var(--primary-color);
    }
  }
  
  .code-example {
    margin: 1.5rem 0;
    
    h4 {
      margin-bottom: 0.5rem;
      color: var(--text-color);
    }
  }
  
  .step-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }
}

// Download Section
.download-section {
  background: var(--surface-color);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

// CSS Variables
:root {
  --success-color: #4caf50;
}`;
}

/**
 * Update recipes routing module to include new recipe routes
 */
function updateRecipesRouting(recipes) {
  const routingFilePath = path.join(RECIPES_COMPONENT_PATH, "recipes-routing.module.ts");
  
  // Generate import statements for recipe detail components
  const imports = recipes.map(recipe => {
    const componentName = `${toKebabCase(recipe.name)}-detail`;
    const className = componentName
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Component';
    
    return `import { ${className} } from './recipe-details/${componentName}/${componentName}.component';`;
  }).join('\\n');

  // Generate route definitions
  const routes = recipes.map(recipe => {
    const componentName = `${toKebabCase(recipe.name)}-detail`;
    const className = componentName
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Component';
    
    return `  { 
    path: '${recipe.category}/${recipe.name}', 
    component: ${className},
    data: { title: '${recipe.title} - Recipe - Data Sync Pro' }
  }`;
  }).join(',\\n');

  const routingContent = `import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RecipesComponent } from './recipes.component';

// Auto-generated recipe detail component imports
${imports}

const routes: Routes = [
  { 
    path: '', 
    component: RecipesComponent,
    data: { title: 'Recipes - Data Sync Pro' }
  },
  { 
    path: ':category', 
    component: RecipesComponent,
    data: { title: 'Recipe Category - Data Sync Pro' }
  },
  // Auto-generated specific recipe routes
${routes},
  { 
    path: ':category/:recipeName', 
    component: RecipesComponent,
    data: { title: 'Recipe Details - Data Sync Pro' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RecipesRoutingModule { }`;

  try {
    fs.writeFileSync(routingFilePath, routingContent);
    console.log(`Updated recipes routing: ${routingFilePath}`);
  } catch (error) {
    console.error(`Failed to update routing:`, error.message);
  }
}

/**
 * Main function to generate all recipe components
 */
function generateAllRecipeComponents() {
  console.log("=== Recipe Component Generator ===");
  console.log(`Reading recipes from: ${RECIPES_JSON_PATH}`);

  // Check if recipes.json exists
  if (!fs.existsSync(RECIPES_JSON_PATH)) {
    console.error(`ERROR: recipes.json not found at ${RECIPES_JSON_PATH}`);
    console.error("Please ensure the recipes.json file exists in src/assets/data/");
    process.exit(1);
  }

  // Read and parse recipes.json
  let recipes;
  try {
    const recipesData = fs.readFileSync(RECIPES_JSON_PATH, "utf8");
    recipes = JSON.parse(recipesData);
  } catch (error) {
    console.error("ERROR: Failed to read or parse recipes.json:", error.message);
    process.exit(1);
  }

  if (!Array.isArray(recipes) || recipes.length === 0) {
    console.error("ERROR: No recipes found in recipes.json");
    process.exit(1);
  }

  console.log(`Found ${recipes.length} recipes to process`);

  // Generate components for each recipe
  let successCount = 0;
  let failureCount = 0;

  recipes.forEach((recipe, index) => {
    console.log(`\\n[${index + 1}/${recipes.length}] Processing: ${recipe.title}`);
    
    const success = createRecipeDetailComponent(recipe);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  });

  // Update routing
  console.log("\\n--- Updating recipes routing module ---");
  updateRecipesRouting(recipes);

  // Summary
  console.log("\\n=== Generation Summary ===");
  console.log(`Total recipes processed: ${recipes.length}`);
  console.log(`Successfully generated: ${successCount}`);
  console.log(`Failed to generate: ${failureCount}`);
  
  if (failureCount > 0) {
    console.log("\\n⚠️  Some components failed to generate. Check the error messages above.");
    process.exit(1);
  } else {
    console.log("\\n✅ All recipe components generated successfully!");
  }
}

// Run the generator if this script is executed directly
if (require.main === module) {
  generateAllRecipeComponents();
}

module.exports = {
  generateAllRecipeComponents,
  createRecipeDetailComponent,
  toKebabCase
};