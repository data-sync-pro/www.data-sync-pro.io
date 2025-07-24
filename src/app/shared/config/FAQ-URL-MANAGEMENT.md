# FAQ URL Management System

## Overview

This system provides centralized management for all FAQ internal navigation links, eliminating the need to hardcode URLs in HTML files and making link maintenance much easier.

## Key Components

### 1. URL Configuration (`faq-urls.config.ts`)

The central configuration file that maps reference keys to actual URLs. This file contains:

- **FAQ_URL_MAPPINGS**: Organized by category with key-value pairs
- **Helper functions**: For URL lookup and building
- **Type definitions**: For type safety

### 2. URL Management Service (`url-management.service.ts`)

Angular service that provides:

- URL lookup by key
- Navigation methods
- Link validation
- Content analysis and repair
- Documentation generation

### 3. Enhanced FAQ Service

The FAQ service now processes content to:

- Resolve `data-faq-link` attributes to actual URLs
- Add CSS classes for styling internal links
- Handle URL transformations automatically

### 4. Update Tool (`update-faq-links.js`)

Node.js script to:

- Scan existing FAQ HTML files
- Add `data-faq-link` attributes to existing links
- Update URLs to match the configuration
- Run in dry-run mode for testing

## Usage

### In HTML Files

Instead of hardcoding URLs, use the `data-faq-link` attribute:

```html
<!-- Old way (hardcoded URL) -->
<a href="/Rules%20Engines/Batch#what-is-a-batch-job-in-general" class="rules-engine-link">
  Batch
</a>

<!-- New way (using key reference) -->
<a href="/Rules%20Engines/Batch#what-is-a-batch-job-in-general" 
   data-faq-link="batch.what-is-batch" 
   class="rules-engine-link">
  Batch
</a>
```

### Adding New URL Mappings

1. **Add to the configuration**:

```typescript
// In faq-urls.config.ts
'rules-engines': {
  'new-engine.overview': {
    key: 'new-engine.overview',
    path: '/Rules%20Engines/New%20Engine',
    fragment: 'overview',
    description: 'New Engine Overview'
  }
}
```

2. **Update the tool's mapping** (in `update-faq-links.js`)

3. **Use in HTML files**:

```html
<a href="/Rules%20Engines/New%20Engine#overview" 
   data-faq-link="new-engine.overview" 
   class="rules-engine-link">
  New Engine
</a>
```

### Running the Update Tool

```bash
# Dry run to see what changes would be made
node src/tools/update-faq-links.js --dry-run

# Update all files
node src/tools/update-faq-links.js

# Update specific file
node src/tools/update-faq-links.js --file=general-five-dsp-engines.html --dry-run
```

## Key Benefits

### 1. Centralized Management
- All URLs defined in one place
- Easy to update when paths change
- Consistent URL structure

### 2. Type Safety
- TypeScript interfaces ensure consistency
- Compile-time validation of URL keys
- IDE autocomplete support

### 3. Maintainability
- Broken link detection
- Automated link updates
- Documentation generation

### 4. Performance
- Links are processed at content load time
- Caching of processed content
- Minimal runtime overhead

## Best Practices

### URL Key Naming Convention

Use hierarchical naming with dots:

```
category.subcategory.specific-item
```

Examples:
- `batch.what-is-batch`
- `data-list.configuration.setup`
- `triggers.advanced.custom-logic`

### HTML File Structure

1. **Always include both `href` and `data-faq-link`**:
   ```html
   <a href="/actual/url" data-faq-link="key" class="faq-internal-link">
   ```

2. **Use descriptive CSS classes**:
   - `faq-internal-link` for all internal FAQ links
   - `rules-engine-link` for rules engine references
   - `process-step-link` for process step references

3. **Include `target="_blank"` for cross-references**:
   ```html
   <a href="/path" data-faq-link="key" target="_blank" rel="noopener noreferrer">
   ```

### Service Usage

```typescript
// In Angular components
constructor(private urlService: UrlManagementService) {}

// Navigate to FAQ by key
this.urlService.navigateToFAQByKey('batch.what-is-batch');

// Get URL for external use
const url = this.urlService.getUrlByKey('data-list.overview');

// Validate content
const validation = this.urlService.validateAndRepairContent(htmlContent);
```

## Migration Strategy

### Phase 1: Setup (Complete)
- ✅ Create URL configuration
- ✅ Implement URL management service
- ✅ Update FAQ service for link processing
- ✅ Create update tool

### Phase 2: Content Update
1. Run dry-run analysis on all FAQ files
2. Review and validate proposed changes
3. Update files incrementally by category
4. Test navigation functionality

### Phase 3: Enhancement
1. Add new URL mappings as needed
2. Implement advanced link validation
3. Create automated link checking CI/CD integration
4. Add link analytics and reporting

## Troubleshooting

### Common Issues

1. **Link not working after update**:
   - Check if the key exists in `FAQ_URL_MAPPINGS`
   - Verify the URL path is correct
   - Ensure `data-faq-link` attribute is present

2. **Tool not updating files**:
   - Run with `--dry-run` first to see proposed changes
   - Check file permissions
   - Verify file path in the tool

3. **TypeScript errors**:
   - Ensure all imports are correct
   - Check that the service is injected properly
   - Verify interface definitions match usage

### Debugging

Enable console logging to see URL resolution:

```typescript
// In browser console
localStorage.setItem('faq-debug', 'true');
```

This will log URL resolution attempts and help identify issues.

## Future Enhancements

1. **Automated Link Validation**: CI/CD integration to check for broken links
2. **Analytics Integration**: Track which links are most used
3. **Dynamic URL Generation**: Support for parameterized URLs
4. **Link Preview**: Hover previews for FAQ references
5. **Bulk Operations**: Tools for mass URL updates and migrations