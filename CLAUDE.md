# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular 15 website for Data Sync Pro, a Salesforce data management platform. The site features a comprehensive FAQ system, dynamic routing, and performance-optimized content loading.

## Development Commands

```bash
# Development server
ng serve

# Build for production
ng build

# Run unit tests
ng test

# Install dependencies
npm install

# Start development with live reload
npm start
```

## Architecture

### Core Structure
- **Angular 15** with Material Design and Bootstrap 5
- **Lazy loading** for FAQ and designer-guide modules
- **Service Worker** enabled for PWA functionality
- **SCSS** preprocessing with modular stylesheets

### Key Components
- **FAQ System**: Complex search, filtering, and content management with lazy loading
- **Search Overlay**: Global search functionality with keyboard shortcuts (Ctrl+K)
- **Responsive Design**: Mobile-first with collapsible sidebars and adaptive layouts

### FAQ System Architecture
The FAQ system is the most complex part of the application:

- **Data Structure**: FAQ items loaded from JSON with lazy HTML content loading
- **Smart Search**: Multi-field search with relevance scoring and highlighting
- **State Management**: Immutable state updates optimized for OnPush change detection
- **URL Routing**: Deep linking support with fragment-based navigation
- **Performance**: Preloading observers, caching, and virtual scrolling considerations

### Services
- `FAQService`: Centralized FAQ data management with caching
- `AnalyticsService`: User interaction tracking with consent management
- `PerformanceService`: Performance monitoring and optimization
- `ApiService`: HTTP client wrapper for API communications

### Routing Structure
```
/                    -> HomeComponent
/faq                 -> FAQ Module (lazy loaded)
/faq/:category       -> Category view
/faq/:cat/:subcat    -> Subcategory view
/designer-guide      -> Designer Guide Module (lazy loaded)
/pricing             -> PricingComponent
/solutions           -> SolutionsComponent
/support             -> SupportComponent
/rules-engines       -> RulesEnginesComponent
```

## Development Guidelines

### FAQ Component Development
- Use immutable state updates via helper methods (`updateSearchState`, `updateUIState`)
- Leverage OnPush change detection - always call `this.cdr.markForCheck()` after async operations
- Content loading is lazy - check `item.safeAnswer` before displaying content
- URL fragments are automatically handled for deep linking

### Performance Considerations
- FAQ content is loaded on-demand via intersection observers
- Search operations are debounced and performance-measured
- Popular FAQ content is pre-cached on component initialization
- Use trackBy functions for ngFor loops in performance-critical areas

### State Management Patterns
The FAQ component uses a structured state approach:
```typescript
interface SearchState { /* search-related state */ }
interface CurrentState { /* navigation state */ }
interface UIState { /* UI visibility state */ }
```

### Responsive Design
- Mobile breakpoint: 768px
- Collapsible sidebars with localStorage persistence
- Mobile-specific navigation patterns (drawer-style)
- Touch-friendly interactions on mobile devices

## Content Management

### FAQ Content
- FAQ metadata in `/src/assets/data/faqs.json`
- HTML content files in `/src/assets/faq-item/`
- Images in `/src/assets/image/` with organized subdirectories
- Content is sanitized via DomSanitizer for security

### Asset Structure
```
/src/assets/
├── data/              # JSON configuration files
├── faq-item/          # Individual FAQ HTML content
├── image/             # FAQ-related images
└── [static assets]    # Images, icons, etc.
```

## Code Style Notes

- Use English for all code comments and documentation
- Leverage Angular Material and Bootstrap classes for consistent styling
- Follow OnPush optimization patterns for better performance
- Implement proper error handling for async content loading
- Use TypeScript strict mode and maintain proper typing

## Special Features

- **Search functionality**: Supports fuzzy search, suggestions, and auto-complete
- **Social sharing**: Built-in sharing capabilities for FAQ items
- **Analytics integration**: User interaction tracking with privacy compliance
- **SEO optimization**: Dynamic meta tags and structured URLs
- **Keyboard navigation**: Full keyboard support including search shortcuts