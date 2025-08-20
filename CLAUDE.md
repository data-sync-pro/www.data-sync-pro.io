# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Angular 15 website for Data Sync Pro (DSP), a Salesforce data synchronization platform. Features comprehensive documentation including FAQ sections, designer guides, recipe tutorials, and product information with a sophisticated JSON-driven content management system.

## Essential Commands

### Development
```bash
ng serve                    # Start dev server on http://localhost:4200
ng serve --port 4201        # Run on alternate port for FAQ editor
ng serve --port 4202        # Run on alternate port for Recipe editor
ng build                    # Production build to dist/website
ng build --watch --configuration development  # Development build with watch
ng build --configuration github-pages  # Build for GitHub Pages deployment
npm install                 # Install dependencies
```

### Testing & Type Checking
```bash
ng test                     # Run tests with Karma + Jasmine
ng test --include='**/component-name.spec.ts'  # Run specific test
ng test --watch=false --browsers=ChromeHeadless  # Headless testing
npx tsc --noEmit           # TypeScript type checking (no linting configured)
```

### Content Generation (Critical for FAQ/Documentation/Recipes)
```bash
node src/tools/generate-faq-components.js      # Generate FAQ components from faqs.json
node src/tools/generate-designer-pages.js      # Generate Designer Guide pages
node src/tools/generate-recipe-components.js   # Generate Recipe components (requires recipes.json)
```

### Component Generation
```bash
ng generate component component-name  # Creates component with SCSS styling
ng g c component-name --flat=false   # Component in its own folder
```

## High-Level Architecture

### Content Management System
The site uses a JSON-driven content generation system with three main content types:

1. **FAQ System**: 
   - Data source: `src/assets/data/faqs.json`
   - HTML content: `src/assets/faq-item/*.html`
   - Auto-linking: Terms in `auto-link-terms.json` should auto-convert to links
   - Service: `shared/services/faq.service.ts` handles caching, preloading, and content processing
   - Storage service: `shared/services/faq-storage.service.ts` for persistence
   - Export service: `shared/services/faq-export.service.ts` for data export

2. **Designer Guide**:
   - Navigation: `src/assets/data/designer-sidebar.json`
   - Content: HTML files in `src/app/designer-guide/designer-guide-item/`
   - Hierarchical documentation with sidebar navigation

3. **Recipe System**:
   - Data source: `src/assets/data/recipes.json` (needs to be created)
   - Content: Would be stored in `src/assets/recipe-content/`
   - Services: `recipe.service.ts`, `recipe-storage.service.ts`, `recipe-export.service.ts`
   - Editor module: `recipe-editor` for content management
   - Infrastructure ready but awaiting content

### Module Architecture
- **Lazy Loading**: FAQ, Designer Guide, Recipes, and Recipe Editor modules load on-demand
- **Active Routes**: 
  - `/` - FAQ module (default)
  - `/faq-editor` - FAQ content editor
  - `/recipe-editor` - Recipe content editor (lazy loaded)
  - `/recipes` - Recipe viewer (lazy loaded)
- **Commented Routes**: Most routes disabled (pricing, home, rules-engines, solutions, support, designer-guide)
- **Shared Module**: Contains reusable services, components, and utilities
- **Service Worker**: PWA support with offline caching for FAQ and recipe content

### Key Services Pattern
Services in `shared/services/` follow these patterns:
- Use RxJS BehaviorSubjects for state management
- Implement caching with localStorage/sessionStorage
- Preload content using Intersection Observer API
- Handle offline scenarios gracefully
- Export capabilities for content management

## Critical Known Issues

### Auto-Link System Bug (HIGH PRIORITY)
**Problem**: FAQ auto-linking is broken - no terms are being linked despite correct configuration
**Location**: `src/app/shared/services/faq.service.ts` lines 863-929
**Root Cause**: The `applyAutoLinkTerms` method only processes terms within `<strong>` tags
**Impact**: Terms like "Batch", "Triggers" aren't becoming clickable links
**Solution**: FAQ HTML content must have terms wrapped in `<strong>` tags for auto-linking to work

### Missing Recipe Content
**Problem**: Recipe infrastructure exists but no `recipes.json` file
**Impact**: Recipe module and editor cannot function without data file
**Solution**: Create `src/assets/data/recipes.json` with appropriate structure

### Chinese Comments in Code
**Location**: `src/app/app-routing.module.ts` lines 42-46
**Action**: Translate to English for consistency

## Project-Specific Patterns

### FAQ Component Optimizations
- Uses `ChangeDetectionStrategy.OnPush` for performance
- TOC highlighting only activates after user interaction (not on initial load)
- Wheel events in TOC are completely isolated from main content
- Complex scroll synchronization with footer-aware positioning
- Content preloading using Intersection Observer
- URL configuration centralized in `shared/config/faq-urls.config.ts`

### Editor Components
- **FAQ Editor**: Standalone component at `/faq-editor`
- **Recipe Editor**: Lazy-loaded module at `/recipe-editor`
- Both editors use storage services for data persistence
- Export functionality with `faq-export.service.ts` and `recipe-export.service.ts`

### Style Architecture
- SCSS with Angular Material + Bootstrap
- Component styles in separate SCSS files
- Modular style organization (e.g., `faq/styles/_layout.scss`)
- Material theme: `indigo-pink`
- Style preprocessor includes path: `src/styles`

## Configuration Details

### Build Configuration
- **Production**: Optimized with tree-shaking, minification
- **Development**: Source maps enabled, no optimization
- **GitHub Pages**: Special configuration with base href
- **Budgets**: 
  - Initial bundle: 1.5MB warning, 2MB error
  - Component styles: 60KB warning, 80KB error

### TypeScript Configuration
- Strict mode enabled (all strict checks)
- Target: ES2022
- Module: ES2022
- Experimental decorators for Angular DI
- JSON module resolution enabled
- No implicit returns/fallthrough

### Service Worker Configuration
- App shell prefetched
- Assets lazy loaded
- FAQ content cached with performance strategy (7 days)
- Recipe content cached with performance strategy (7 days)
- API data cached with freshness strategy (1 day, 5s timeout)

## Important File Locations

### Configuration Files
- **FAQ URLs**: `src/app/shared/config/faq-urls.config.ts`
- **Service Worker**: `ngsw-config.json`
- **TypeScript**: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`

### Data Files
- **Auto-link Terms**: `src/assets/data/auto-link-terms.json`
- **FAQ Data**: `src/assets/data/faqs.json`
- **Designer Sidebar**: `src/assets/data/designer-sidebar.json`
- **Recipes**: `src/assets/data/recipes.json` (needs creation)

### Content Files
- **FAQ Content**: `src/assets/faq-item/*.html`
- **Designer Content**: `src/app/designer-guide/designer-guide-item/*.html`
- **Recipe Content**: `src/assets/recipe-content/` (future)

### Generator Scripts
- **FAQ Generator**: `src/tools/generate-faq-components.js`
- **Designer Generator**: `src/tools/generate-designer-pages.js`
- **Recipe Generator**: `src/tools/generate-recipe-components.js`

## Development Notes

### Cache Management
- Clear cache after FAQ/content changes: `localStorage.clear(); sessionStorage.clear()`
- Service worker caches FAQ and recipe content separately
- Browser refresh may be needed after content updates

### Editor Settings
- 2 spaces indentation (not tabs)
- UTF-8 encoding
- Single quotes in TypeScript
- SCSS for styles (not CSS)

### Deployment Assets
- GitHub Pages support files: `404.html`, `.nojekyll`, `CNAME`
- PWA manifest: `manifest.webmanifest`
- Logo: `pushtopic-logo.png`

### Performance Services
- `performance.service.ts` for monitoring
- `offline.service.ts` for offline handling
- `notification.service.ts` for user notifications
- `analytics.service.ts` for tracking