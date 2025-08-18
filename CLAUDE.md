# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Angular 15 website for Data Sync Pro (DSP), a Salesforce data synchronization platform. Features comprehensive documentation including FAQ sections, designer guides, and product information with a sophisticated content management system.

## Essential Commands

### Development
```bash
ng serve                    # Start dev server on http://localhost:4200
ng build                    # Production build to dist/website
ng build --watch --configuration development  # Development build with watch
npm install                 # Install dependencies
```

### Testing
```bash
ng test                     # Run tests with Karma + Jasmine
ng test --include='**/component-name.spec.ts'  # Run specific test
ng test --watch=false --browsers=ChromeHeadless  # Headless testing
npx tsc --noEmit           # TypeScript type checking
```

### Content Generation (Critical for FAQ/Documentation)
```bash
node src/tools/generate-faq-components.js      # Generate FAQ components from faqs.json
node src/tools/generate-designer-pages.js      # Generate Designer Guide pages
node src/tools/generate-recipe-components.js   # Generate Recipe components (Note: recipes.json doesn't exist yet)
```

### Component Generation
```bash
ng generate component component-name  # Creates component with SCSS styling
ng g c component-name --flat=false   # Component in its own folder
```

## High-Level Architecture

### Content Management System
The site uses a JSON-driven content generation system rather than traditional CMS:

1. **FAQ System**: 
   - Data source: `src/assets/data/faqs.json`
   - HTML content: `src/assets/faq-item/*.html`
   - Auto-linking: Terms in `auto-link-terms.json` should auto-convert to links
   - Service: `shared/services/faq.service.ts` handles caching, preloading, and content processing

2. **Designer Guide**:
   - Navigation: `src/assets/data/designer-sidebar.json`
   - Content: HTML files in `src/app/designer-guide/designer-guide-item/`
   - Hierarchical documentation with sidebar navigation

3. **Recipe System** (Planned):
   - Would use `src/assets/data/recipes.json` (file doesn't exist)
   - Interactive step-by-step tutorials with progress tracking
   - Generator script exists but needs data file

### Module Architecture
- **Lazy Loading**: FAQ, Designer Guide, and Recipes modules load on-demand
- **Routing**: Most routes commented out in `app-routing.module.ts` - only FAQ (root) and pricing active
- **Shared Module**: Contains reusable services, components, and utilities
- **Service Worker**: PWA support with offline caching configured in `ngsw-config.json`

### Key Services Pattern
Services in `shared/services/` follow these patterns:
- Use RxJS BehaviorSubjects for state management
- Implement caching with localStorage/sessionStorage
- Preload content using Intersection Observer API
- Handle offline scenarios gracefully

## Critical Known Issues

### Auto-Link System Bug (HIGH PRIORITY)
**Problem**: FAQ auto-linking is broken - no terms are being linked despite correct configuration
**Location**: `src/app/shared/services/faq.service.ts` lines 863-929
**Root Cause**: The `applyAutoLinkTerms` method only processes terms within `<strong>` tags
**Impact**: Terms like "Batch", "Triggers" aren't becoming clickable links
**Solution**: The linking logic is restricted to `<strong>` wrapped terms only - verify FAQ HTML content has terms wrapped in `<strong>` tags

## Project-Specific Patterns

### FAQ Component Optimizations
- Uses `ChangeDetectionStrategy.OnPush` for performance
- TOC highlighting only activates after user interaction (not on initial load)
- Wheel events in TOC are completely isolated from main content
- Complex scroll synchronization with footer-aware positioning
- Content preloading using Intersection Observer

### Pricing Component
- Interactive modal overlay for bundle configuration
- All pricing cards are clickable (not just buttons)
- Real-time price calculation with addon selections
- Generates detailed sales inquiry emails

### Style Architecture
- SCSS with Angular Material + Bootstrap
- Component styles in separate SCSS files
- Modular style organization (e.g., `faq/styles/_layout.scss`)
- Material theme: `indigo-pink`

## Configuration Details

### Build Budgets
- Initial bundle: 1.5MB warning, 2MB error
- Component styles: 60KB warning, 80KB error

### TypeScript
- Strict mode enabled
- Target: ES2022
- Experimental decorators for Angular DI

### Editor Settings
- 2 spaces indentation (not tabs)
- UTF-8 encoding
- Single quotes in TypeScript

## Important File Locations

- **FAQ URLs Configuration**: `src/app/shared/config/faq-urls.config.ts` - centralized URL management
- **Auto-link Terms**: `src/assets/data/auto-link-terms.json` - terms that should auto-link
- **FAQ Data**: `src/assets/data/faqs.json` - FAQ questions and categories
- **FAQ Content**: `src/assets/faq-item/*.html` - actual FAQ answer content

## Development Notes

- **Service Worker**: Clear cache after FAQ changes: `localStorage.clear(); sessionStorage.clear()`
- **Chinese Comments**: Some exist in routing file (lines 38-41) - translate to English
- **Missing Recipe Data**: `recipes.json` doesn't exist but infrastructure is ready
- **Active Routes**: Most routes disabled - only FAQ and pricing currently active