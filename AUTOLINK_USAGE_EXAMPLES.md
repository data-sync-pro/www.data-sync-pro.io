# Auto-Link Usage Examples

The auto-link functionality has been successfully extended to the entire website. Below are examples of how to use it in different scenarios.

## Available Methods

### 1. Using AutoLinkService (in TypeScript)
```typescript
import { AutoLinkService } from '@shared/services/auto-link.service';

constructor(private autoLinkService: AutoLinkService) {}

processContent() {
  const htmlContent = '<p>Learn about <strong>Batch</strong> processing and <strong>Triggers</strong>.</p>';
  const processedContent = this.autoLinkService.applyAutoLinkTerms(htmlContent);
  // Result: Terms in <strong> tags are converted to links
}
```

### 2. Using AutoLinkDirective (in Templates)
```html
<!-- Apply auto-link to dynamic content -->
<div [appAutoLink]="htmlContent"></div>

<!-- Disable auto-link when needed -->
<div [appAutoLink]="htmlContent" [autoLinkDisabled]="true"></div>

<!-- Example in a component -->
<article class="content-section">
  <div [appAutoLink]="articleContent"></div>
</article>
```

### 3. Using AutoLinkPipe (in Templates)
```html
<!-- Basic usage with SafeHtml output -->
<div [innerHTML]="htmlContent | autoLink"></div>

<!-- Get string output instead of SafeHtml -->
<div>{{ htmlContent | autoLink:false }}</div>

<!-- In a loop -->
<div *ngFor="let item of items">
  <div [innerHTML]="item.description | autoLink"></div>
</div>
```

## Integration Examples

### Recipe Module
The RecipeService has been updated to automatically apply auto-links to recipe content:
```typescript
// In recipe.service.ts
safeOverview: this.sanitizer.bypassSecurityTrustHtml(
  this.autoLinkService.applyAutoLinkTerms(record.overview || '')
)
```

### FAQ Module
The FAQService uses AutoLinkService for processing FAQ content:
```typescript
// In faq.service.ts
processedContent = this.autoLinkService.applyAutoLinkTerms(processedContent);
```

### Custom Component Example
```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-my-component',
  template: `
    <div class="content">
      <!-- Method 1: Using directive -->
      <section [appAutoLink]="content"></section>
      
      <!-- Method 2: Using pipe -->
      <section [innerHTML]="content | autoLink"></section>
    </div>
  `
})
export class MyComponent {
  content = `
    <p>DSP provides powerful <strong>Batch</strong> processing capabilities.</p>
    <p>You can also use <b>Triggers</b> for real-time processing.</p>
    <p>The <strong>Data List</strong> feature helps manage your data effectively.</p>
    <p>#<b>Action Button</b> enables quick actions on records.</p>
    
    <p>Use functions like <code>SUBSTRING</code> for text processing.</p>
    <p>The <strong>IF</strong> function provides conditional logic.</p>
    <p>Format dates with <b>FORMAT_DATETIME</b> or <code>NOW</code>.</p>
  `;
}
```

## Important Notes

1. **Tag Requirements**:
   - **FAQ Links**: Must use `<strong>` or `<b>` tags
   - **Function Links**: Can use `<strong>`, `<b>`, or `<code>` tags
2. **Case-sensitive matching** - Terms must match exactly as configured in `auto-link-terms.json`
3. **Proper capitalization required** - Each word in multi-word terms must start with uppercase
4. **Auto-loaded configuration** - The AutoLinkService automatically loads terms from `assets/data/auto-link-terms.json`
5. **Tag preservation** - The original tag type is preserved (i.e., `<strong>` remains `<strong>`, `<b>` remains `<b>`, `<code>` remains `<code>`)
6. **External links** - Function documentation links open in new tabs and point to `https://transformation.pushtopic.com/#/docs/`

## Configuration

The auto-link terms are configured in `src/assets/data/auto-link-terms.json`:

### FAQ Links (Internal)
```json
{
  "terms": {
    "Batch": {
      "faqLink": "batch.what-is-batch",
      "caseSensitive": true,
      "description": "Batch Rules Engine"
    },
    "Triggers": {
      "faqLink": "triggers.how-it-works",
      "caseSensitive": true,
      "description": "Triggers Rules Engine"
    }
  }
}
```

### Function Links (External)
```json
{
  "terms": {
    "SUBSTRING": { "functionDoc": "SUBSTRING" },
    "IF": { "functionDoc": "IF" },
    "TRIM": { "functionDoc": "TRIM" },
    "NOW": { "functionDoc": "NOW" }
    // ... 120+ more functions
  }
}
```

## Module Setup

Make sure to import SharedModule in your module to use the directive and pipe:
```typescript
import { SharedModule } from '@shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    SharedModule  // Includes AutoLinkDirective and AutoLinkPipe
  ]
})
export class YourModule { }
```

## Testing

To test auto-link functionality:

### FAQ Links
1. Wrap terms in `<strong>` or `<b>` tags: `<strong>Batch</strong>`
2. Should link to internal FAQ pages on the current site
3. Check browser console for warnings about missing FAQ links

### Function Links  
1. Wrap function names in `<strong>`, `<b>`, or `<code>` tags: `<code>SUBSTRING</code>`
2. Should link to `https://transformation.pushtopic.com/#/docs/FUNCTION_NAME`
3. Links open in new tabs
4. All 120+ functions are supported

### Link Examples
- `<strong>Batch</strong>` → Internal FAQ
- `<b>Triggers</b>` → Internal FAQ  
- `<code>SUBSTRING</code>` → `https://transformation.pushtopic.com/#/docs/SUBSTRING`
- `<strong>IF</strong>` → `https://transformation.pushtopic.com/#/docs/IF`
- `<b>TRIM</b>` → `https://transformation.pushtopic.com/#/docs/TRIM`