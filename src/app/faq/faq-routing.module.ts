import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlSegment, UrlMatchResult } from '@angular/router';
import { FaqComponent } from './faq.component';

// Matcher function for category routes
function categoryMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length === 1) {
    const path = segments[0].path.toLowerCase();
    // Use the same category keys as in FaqComponent.categoryMapping
    const validCategories = [
      'general', 
      'processes', 
      'process-steps',
      'query-manager-q', 
      'rules-engines', 
      'transformation',
      'executables',
      'connections'
    ];
    
    // Only match known categories, reject answerPaths
    if (validCategories.includes(path)) {
      return { consumed: segments, posParams: { cat: segments[0] } };
    }
  }
  return null; // Reject match, including answerPaths
}

// Matcher function for category/subcategory routes  
function categorySubcategoryMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length === 2) {
    const catPath = segments[0].path.toLowerCase();
    const subCatPath = segments[1].path.toLowerCase();
    // Use the same category keys as in FaqComponent.categoryMapping
    const validCategories = [
      'general', 
      'processes', 
      'process-steps',
      'query-manager-q', 
      'rules-engines', 
      'transformation',
      'executables',
      'connections'
    ];
    const validSubCategories = ['action-button', 'action', 'batch', 'data-list', 'data-loader', 'input', 'mapping', 'match', 'preview', 'retrieve', 'scoping', 'trigger', 'verify'];
    
    // Only match valid category/subcategory combinations
    if (validCategories.includes(catPath) && validSubCategories.includes(subCatPath)) {
      return { consumed: segments, posParams: { cat: segments[0], subCat: segments[1] } };
    }
  }
  return null; // Reject invalid combinations
}

// Matcher function for answerPath routes (FAQ navigation)
function answerPathMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length === 1) {
    const path = segments[0].path.toLowerCase();
    
    // Use same logic as FaqComponent.isAnswerBasedURL()
    const hasMultipleHyphens = (path.match(/-/g) || []).length >= 2;
    const isLongerThanCategory = path.length > 15;
    
    // Ensure it's not a known category
    const validCategories = [
      'general', 
      'processes', 
      'process-steps',
      'query-manager-q', 
      'rules-engines', 
      'transformation',
      'executables',
      'connections'
    ];
    const isKnownCategory = validCategories.includes(path);
    
    // If it looks like answerPath and is not a known category, match it
    if (hasMultipleHyphens && isLongerThanCategory && !isKnownCategory) {
      return { consumed: segments, posParams: { cat: segments[0] } }; // Use 'cat' param for compatibility
    }
  }
  return null; // Reject if doesn't look like answerPath
}

const routes: Routes = [
  { path: '', component: FaqComponent },
  { 
    matcher: categoryMatcher, 
    component: FaqComponent 
  },
  { 
    matcher: categorySubcategoryMatcher, 
    component: FaqComponent 
  },
  { 
    matcher: answerPathMatcher, 
    component: FaqComponent 
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FaqRoutingModule { }