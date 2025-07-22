# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular 15 website for Data Sync Pro (DSP), a Salesforce data synchronization platform. The site features comprehensive documentation including FAQ sections, designer guides, and product information. The project uses Angular with Angular Material, Bootstrap, and includes service worker support for offline functionality.

## Development Commands

- **Start development server**: `ng serve` or `npm start` (runs on http://localhost:4200)
- **Build for production**: `ng build` (outputs to dist/website)
- **Build for development**: `ng build --configuration development`
- **Watch mode**: `ng build --watch --configuration development`
- **Run tests**: `ng test` (uses Karma + Jasmine)
- **Generate components**: `ng generate component component-name` (uses SCSS styling by default)
  - Shortcuts: `ng g c component-name`
  - Other generators: `ng generate directive|pipe|service|class|guard|interface|enum|module`
- **Install dependencies**: `npm install`
- **Generate FAQ components**: `node src/tools/generate-faq-components.js`
- **Generate Designer Guide pages**: `node src/tools/generate-designer-pages.js`
- **Generate Recipe components**: `node src/tools/generate-recipe-components.js` (generates recipe detail components from recipes.json)
- **Extract i18n**: `ng extract-i18n` (Angular i18n extraction)
- **Angular CLI help**: `ng help` (view all available Angular CLI commands)

### Testing Commands
- **Run specific test**: `ng test --include='**/component-name.spec.ts'`
- **Run tests in watch mode**: `ng test --watch`
- **Run tests once**: `ng test --watch=false`
- **Run tests headless**: `ng test --watch=false --browsers=ChromeHeadless`
- **TypeScript compilation check**: `npx tsc --noEmit`

## Architecture Overview

### Core Structure
- **Main modules**: App, FAQ (lazy-loaded), Designer Guide (lazy-loaded), Shared
- **Key components**: Home, Header, Footer, Pricing (with interactive bundle configurator), Solutions, Rules Engines, Support
- **Routing**: Uses lazy loading for FAQ and Designer Guide modules with preload strategy
- **State management**: Uses Angular services for data management
- **UI framework**: Angular Material + Bootstrap for styling

### Content Management System
The site features a sophisticated content generation system:

- **FAQ system**: JSON-driven FAQ content (`src/assets/data/faqs.json`) with auto-generated components
- **Designer Guide**: Hierarchical documentation system with sidebar navigation (`src/assets/data/designer-sidebar.json`)
- **Recipe system**: Interactive recipe/tutorial system (`src/assets/data/recipes.json`) with step-by-step walkthroughs
- **Content generation**: Node.js scripts in `src/tools/` for generating components from JSON data:
  - `generate-faq-components.js` - generates FAQ components
  - `generate-designer-pages.js` - generates designer guide pages
  - `generate-recipe-components.js` - generates recipe detail components with interactive walkthroughs
- **HTML content**: Static HTML files stored in `src/assets/faq-item/` for FAQ answers

### Special Features
- **Image zoom directives**: `zoomable.directive.ts` and `simple-zoomable.directive.ts` for image interactions
- **Scroll management**: Custom scroll-to-top component with footer-aware positioning
- **Search functionality**: Search overlay component for content discovery
- **Interactive pricing configurator**: Modal overlay system for customizing subscription bundles with real-time calculations
- **Offline support**: Service worker implementation with Angular PWA features
- **Analytics integration**: Google Analytics service for tracking
- **Cookie consent**: GDPR-compliant cookie consent component
- **TOC (Table of Contents)**: Intelligent highlighting system that only activates on user scroll/interaction
- **Modular styling**: Component styles organized in separate SCSS files under `styles/` directories

### Key Services
- **API Service**: `api.service.ts` for backend communication
- **FAQ Service**: `shared/services/faq.service.ts` for FAQ data management with caching and preloading
- **Performance Service**: `shared/services/performance.service.ts` for optimization
- **Offline Service**: `shared/services/offline.service.ts` for PWA functionality
- **Analytics Service**: `analytics.service.ts` for Google Analytics integration

## Content Generation Workflow

### FAQ Components
To generate new FAQ components:
1. Update `src/assets/data/faqs.json` with new FAQ entries
2. Run `node src/tools/generate-faq-components.js` to auto-generate Angular components
3. Add corresponding HTML content files to `src/assets/faq-item/`

### Recipe Components
To generate new recipe components:
1. Update `src/assets/data/recipes.json` with new recipe entries
2. Run `node src/tools/generate-recipe-components.js` to auto-generate Angular components
3. The script automatically:
   - Creates component files (TypeScript, HTML, SCSS)
   - Updates routing module with new recipe routes
   - Generates interactive step-by-step walkthrough UI
   - Includes progress tracking functionality

## Build Configuration

- **Production builds**: Optimized with budget limits (1.5mb warning, 2mb error)
- **Asset handling**: Custom asset copying for designer guide HTML files
- **Styling**: SCSS with Material Design theme and Bootstrap integration
- **Bundle optimization**: Supports differential loading and tree shaking

## TypeScript Configuration

- **Main config**: `tsconfig.json` with Angular-specific settings and strict mode enabled
- **App config**: `tsconfig.app.json` for application builds
- **Test config**: `tsconfig.spec.json` for unit testing

## Key Data Files

- **FAQ content**: `src/assets/data/faqs.json` - drives FAQ section generation
- **Designer Guide nav**: `src/assets/data/designer-sidebar.json` - sidebar navigation structure
- **Recipe data**: `src/assets/data/recipes.json` - recipe/tutorial content with walkthroughs
- **Auto-link terms**: `src/assets/data/auto-link-terms.json` - terms to auto-convert to links in FAQ
- **FAQ HTML content**: `src/assets/faq-item/*.html` - static HTML content for FAQ answers
- **Service Worker config**: `ngsw-config.json` - PWA caching configuration

## Content Generation Tools

- **FAQ Component Generator**: `src/tools/generate-faq-components.js` - creates Angular components from FAQ JSON
- **Designer Page Generator**: `src/tools/generate-designer-pages.js` - processes designer guide content
- **Recipe Component Generator**: `src/tools/generate-recipe-components.js` - creates interactive recipe detail components with:
  - Step-by-step walkthroughs using Angular Material Stepper
  - Progress tracking stored in localStorage
  - Dynamic route generation for each recipe
  - Automatic component scaffolding with TypeScript, HTML, and SCSS templates
- All tools use Angular CLI internally to scaffold components

## Performance and Optimization

- **Bundle budgets**: Warning at 1.5MB, error at 2MB for initial bundles
- **Component style budget**: Warning at 60KB, error at 80KB per component
- **Lazy loading**: FAQ and Designer Guide modules are lazy-loaded
- **Preloading strategy**: Uses `PreloadAllModules` for improved UX
- **Service Worker**: Configured with custom caching strategies for FAQ content
- **PWA features**: Offline support with manifest.webmanifest

## Routing Configuration

- **Scroll behavior**: Custom scroll restoration disabled, managed by components
- **Anchor scrolling**: Disabled to prevent conflicts
- **Scroll offset**: 80px offset for fixed header
- **Lazy modules**: FAQ (`/faq`) and Designer Guide (`/designer-guide`) are lazy-loaded
- **Fallback**: All unknown routes redirect to home (`''`)
- **Current routing**: Most routes are commented out in app-routing.module.ts - only FAQ (root path) and pricing are active
- **Module preloading**: Uses `PreloadAllModules` strategy for better performance

## Active Development Tasks

### Auto-Link System Issue (High Priority)
The FAQ auto-link system that converts key terms (like "Batch", "Triggers") into clickable links has a detection logic issue. See `TODO.md` for detailed debugging information and fix instructions. The main issue is in `src/app/shared/services/faq.service.ts` lines 754-792 where the link detection algorithm incorrectly skips all matches.

## Styling Architecture

- **SCSS**: Default component styling with `includePaths: ["src/styles"]` 
- **Angular Material**: Uses `indigo-pink` prebuilt theme
- **Bootstrap**: v5.3.3 integrated alongside Material Design
- **Style organization**: Component-specific SCSS files with shared style includes
- **Modular styles**: Complex components like FAQ use modular SCSS structure (e.g., `faq/styles/_layout.scss`, `_sidebar.scss`, etc.)
- **English comments**: Use English for code comments as per project convention (note: some Chinese comments exist in routing file and should be translated)


## Important Implementation Details

### FAQ Component Architecture
- **Change Detection**: Uses `OnPush` strategy for performance optimization
- **User Interaction Tracking**: TOC highlighting only activates after user scrolls or clicks
- **Wheel Event Isolation**: Mouse wheel events in TOC are isolated to prevent unintended interactions
- **Scroll Synchronization**: Sophisticated scroll position tracking with footer-aware positioning
- **Content Caching**: FAQ content is cached and preloaded using Intersection Observer API
- **State Management**: Complex UI state tracking for mobile/desktop layouts and TOC visibility

### Event Handling Best Practices
- **Scroll Events**: Optimized with `requestAnimationFrame` and throttling
- **Wheel Events**: Complete isolation in TOC - uses `preventDefault()` and manual scroll handling
- **TOC Wheel Isolation**: Mouse wheel in TOC only scrolls TOC content, never triggers FAQ state changes
- **Performance**: Extensive use of caching and memoization for scroll position calculations
- **User Selection**: TOC items use `user-select: none` to prevent text selection during scroll

### Pricing Component Architecture
- **Interactive Bundle Configuration**: Modal overlay system for customizing subscription tiers
- **Click-to-Configure**: All pricing tier cards are clickable with hover hints for intuitive UX
- **Real-time Calculation**: Dynamic pricing updates based on addon selections (connections, executables, batch capacity)
- **Responsive Layout**: 4-column desktop layout that adapts to 2-column tablet and single-column mobile
- **Modal Management**: Overlay system with backdrop blur, body scroll prevention, and smooth animations
- **Bundle Customization**: Three pricing components - Additional Connections ($600/month), Additional Executables ($10/month), Batch Processing Upgrades ($2k-5k/month)
- **Email Integration**: Automatic generation of detailed sales inquiry emails with bundle configuration
- **Sticky Summary**: Right sidebar summary panel that stays visible during configuration
- **Form State Management**: Uses Angular reactive forms with real-time validation and state updates

## Code Style Guidelines

### Editor Configuration (.editorconfig)
- **Indentation**: 2 spaces (not tabs) for all files
- **Character encoding**: UTF-8 for all files
- **Line endings**: Insert final newline, trim trailing whitespace (except Markdown)
- **TypeScript quotes**: Use single quotes in TypeScript files
- **Markdown files**: No max line length, preserve trailing spaces

### Development Practices
- **Comments**: Always use English for code comments and documentation
- **File naming**: Use kebab-case for component files (e.g., `my-component.ts`)
- **Component structure**: Follow Angular style guide for component organization
- **Imports**: Organize imports - Angular core first, then third-party libraries, then local imports

## TypeScript Configuration Details

- **Strict mode**: Enabled with comprehensive type checking
- **Target**: ES2022 with modern JavaScript features
- **Experimental decorators**: Enabled for Angular dependency injection
- **JSON module resolution**: Supported for data file imports
- **Angular compiler options**: Strict templates and injection parameters enabled

## Active Development Issues

### High Priority: Auto-linking System Fix
There is a critical issue with the FAQ auto-linking system that needs immediate attention:
- **Issue**: Auto-link detection logic is too strict, preventing all automatic term linking
- **Location**: `src/app/shared/services/faq.service.ts` lines 754-792
- **Symptoms**: Terms like "Batch", "Triggers" are found but incorrectly skipped as "inside existing link"
- **Impact**: No automatic links are created in FAQ content
- **Testing**: After fixing, clear browser cache and check console for "✅ Created link:" messages

For detailed debugging steps and solution options, see TODO.md.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.