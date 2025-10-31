import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { RecipeUiStateService } from './recipe-ui-state.service';
import { TIMING } from '../../shared/constants/timing.constants';
import { INTERSECTION_CONFIG } from '../../shared/constants/observer.constants';

/**
 * Navigation event types
 */
export interface NavigationEvent {
  type: 'section-changed' | 'user-scrolled';
  sectionId?: string;
}

/**
 * Service responsible for recipe navigation, scrolling, and section tracking
 *
 * This service handles:
 * - Optimized scroll listening
 * - Intersection Observer for section visibility
 * - Section navigation (scrolling)
 * - Active section tracking
 * - URL hash management
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeNavigationService {

  // Observable for navigation events
  private navigationEvent$ = new Subject<NavigationEvent>();
  private navigationEvents$?: Observable<NavigationEvent>;

  // Scroll listener
  private optimizedScrollListener?: () => void;

  // Intersection Observer
  private sectionObserver?: IntersectionObserver;
  private visibleSections = new Set<string>();

  // DOM query cache for performance optimization
  private cachedSections: Element[] = [];

  // Scroll direction tracking
  private scrollDirection: 'up' | 'down' = 'down';
  private lastScrollY: number = 0;

  constructor(private uiStateService: RecipeUiStateService) { }

  // ============================================================================
  // PUBLIC API - Observable Events
  // ============================================================================

  /**
   * Get navigation events as observable
   * Uses shareReplay to share subscription across multiple subscribers
   * This prevents duplicate event handling and improves performance
   */
  getNavigationEvents(): Observable<NavigationEvent> {
    if (!this.navigationEvents$) {
      this.navigationEvents$ = this.navigationEvent$.pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.navigationEvents$;
  }

  // ============================================================================
  // SETUP METHODS - Initialize Observers and Listeners
  // ============================================================================

  /**
   * Setup optimized scroll listener for section highlighting
   * Also tracks scroll direction for better section selection
   */
  setupOptimizedScrollListener(): void {
    if (typeof window === 'undefined') return;

    this.optimizedScrollListener = () => {
      // Detect scroll direction
      const currentScrollY = window.scrollY;
      this.scrollDirection = currentScrollY > this.lastScrollY ? 'down' : 'up';
      this.lastScrollY = currentScrollY;

      // Mark that user has scrolled - this enables TOC highlighting
      if (!this.uiStateService.hasUserScrolled()) {
        this.uiStateService.markUserScrolled();
        this.navigationEvent$.next({ type: 'user-scrolled' });
      }
    };

    window.addEventListener('scroll', this.optimizedScrollListener, { passive: true });
  }

  /**
   * Setup Intersection Observer for automatic TOC highlighting
   * Uses optimized configuration from INTERSECTION_CONFIG for better accuracy
   */
  setupSectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const options: IntersectionObserverInit = {
      root: null,
      // Use fixed pixel values instead of percentage for consistent behavior
      rootMargin: `-${INTERSECTION_CONFIG.HEADER_OFFSET}px 0px -${INTERSECTION_CONFIG.BOTTOM_MARGIN}px 0px`,
      // Multiple thresholds for improved detection accuracy
      threshold: [...INTERSECTION_CONFIG.THRESHOLDS]
    };

    this.sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const sectionId = entry.target.id;
        // Only consider section visible if intersection ratio meets threshold
        // This avoids false positives during fast scrolling
        if (entry.isIntersecting && entry.intersectionRatio >= INTERSECTION_CONFIG.VISIBILITY_THRESHOLD) {
          this.visibleSections.add(sectionId);
        } else if (!entry.isIntersecting || entry.intersectionRatio < INTERSECTION_CONFIG.VISIBILITY_THRESHOLD) {
          this.visibleSections.delete(sectionId);
        }
      });

      // Update active section to the first visible one in DOM order
      if (this.visibleSections.size > 0) {
        const firstVisible = this.getFirstVisibleSectionInDOMOrder();
        if (firstVisible) {
          this.updateActiveSection(firstVisible);
        }
      }
    }, options);
  }

  /**
   * Observe all sections for TOC highlighting
   * @param overviewElementIds - Array of overview section element IDs
   * @param walkthroughStepCount - Number of walkthrough steps
   */
  observeAllSections(overviewElementIds: string[], walkthroughStepCount: number): void {
    if (!this.sectionObserver) return;

    // Collect all element IDs
    const allElementIds: string[] = [...overviewElementIds];
    for (let i = 0; i < walkthroughStepCount; i++) {
      allElementIds.push(`step-${i}`);
    }

    // Use requestAnimationFrame for optimal timing after DOM render
    // This is faster and more reliable than setTimeout(100)
    requestAnimationFrame(() => {
      // Observe Overview sections
      overviewElementIds.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
          this.sectionObserver?.observe(element);
        }
      });

      // Observe Walkthrough steps
      for (let i = 0; i < walkthroughStepCount; i++) {
        const element = document.getElementById(`step-${i}`);
        if (element) {
          this.sectionObserver?.observe(element);
        }
      }

      // Cache all sections for DOM order queries (performance optimization)
      this.cachedSections = Array.from(document.querySelectorAll('[id^="recipe-"], [id^="step-"]'));

      // Manual initial section detection
      this.detectInitialVisibleSection(allElementIds);
    });
  }

  // ============================================================================
  // STATE MANAGEMENT - Track Active Section and Visibility
  // ============================================================================

  /**
   * Update active section for TOC highlighting
   */
  private updateActiveSection(sectionId: string): void {
    const currentSectionId = this.uiStateService.getActiveSectionId();
    if (currentSectionId !== sectionId) {
      this.uiStateService.setActiveSectionId(sectionId);
      this.navigationEvent$.next({
        type: 'section-changed',
        sectionId: sectionId
      });
    }
  }

  /**
   * Manually detect initial visible section when IntersectionObserver doesn't trigger
   * This handles the case when sections are already visible on page load
   *
   * Uses visibility-based detection (same logic as IntersectionObserver) instead of distance
   */
  private detectInitialVisibleSection(elementIds: string[]): void {
    const headerOffset = INTERSECTION_CONFIG.HEADER_OFFSET;
    const bottomMargin = INTERSECTION_CONFIG.BOTTOM_MARGIN;
    const viewportHeight = window.innerHeight;

    // Calculate the observation area (same as IntersectionObserver rootMargin)
    const observeTop = window.scrollY + headerOffset;
    const observeBottom = window.scrollY + viewportHeight - bottomMargin;

    let bestSection: { id: string; visibleRatio: number } | null = null;

    for (const elementId of elementIds) {
      const element = document.getElementById(elementId);
      if (!element) continue;

      const rect = element.getBoundingClientRect();
      const elementTop = window.scrollY + rect.top;
      const elementBottom = elementTop + rect.height;

      // Calculate visible height within observation area
      const visibleTop = Math.max(elementTop, observeTop);
      const visibleBottom = Math.min(elementBottom, observeBottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      // Calculate visibility ratio
      const visibleRatio = visibleHeight / rect.height;

      // Only consider sections that meet the visibility threshold
      if (visibleRatio >= INTERSECTION_CONFIG.VISIBILITY_THRESHOLD) {
        if (!bestSection || visibleRatio > bestSection.visibleRatio) {
          bestSection = { id: elementId, visibleRatio };
        }
      }
    }

    if (bestSection) {
      this.visibleSections.add(bestSection.id);
      this.updateActiveSection(bestSection.id);
    }
  }

  /**
   * Get the most relevant visible section based on visibility and scroll direction
   * Instead of simply returning the first visible section in DOM order,
   * this method calculates actual visibility ratio and considers scroll direction
   */
  private getFirstVisibleSectionInDOMOrder(): string | null {
    if (this.visibleSections.size === 0) return null;

    // If only one section is visible, return it immediately
    if (this.visibleSections.size === 1) {
      return Array.from(this.visibleSections)[0];
    }

    // Use cached sections instead of querying DOM every time
    const allSections = this.cachedSections.length > 0
      ? this.cachedSections
      : Array.from(document.querySelectorAll('[id^="recipe-"], [id^="step-"]'));

    const headerOffset = INTERSECTION_CONFIG.HEADER_OFFSET;
    const bottomMargin = INTERSECTION_CONFIG.BOTTOM_MARGIN;
    const viewportHeight = window.innerHeight;
    const observeTop = window.scrollY + headerOffset;
    const observeBottom = window.scrollY + viewportHeight - bottomMargin;

    let bestSection: { id: string; visibleRatio: number; index: number } | null = null;

    // Calculate visibility ratio for each visible section
    allSections.forEach((section: Element, index: number) => {
      if (!section.id || !this.visibleSections.has(section.id)) return;

      const rect = section.getBoundingClientRect();
      const elementTop = window.scrollY + rect.top;
      const elementBottom = elementTop + rect.height;

      const visibleTop = Math.max(elementTop, observeTop);
      const visibleBottom = Math.min(elementBottom, observeBottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibleRatio = visibleHeight / rect.height;

      if (!bestSection || visibleRatio > bestSection.visibleRatio) {
        // This section is more visible
        bestSection = { id: section.id, visibleRatio, index };
      } else if (Math.abs(visibleRatio - bestSection.visibleRatio) < 0.05) {
        // Visibility is similar (within 5%), use scroll direction to decide
        if (this.scrollDirection === 'down' && index > bestSection.index) {
          // Scrolling down, prefer the section further down
          bestSection = { id: section.id, visibleRatio, index };
        } else if (this.scrollDirection === 'up' && index < bestSection.index) {
          // Scrolling up, prefer the section further up
          bestSection = { id: section.id, visibleRatio, index };
        }
      }
    });

    // Return best section ID or fallback to first item in Set
    return (bestSection as { id: string; visibleRatio: number; index: number } | null)?.id || Array.from(this.visibleSections)[0] || null;
  }

  // ============================================================================
  // NAVIGATION - User-Initiated Section Scrolling
  // ============================================================================

  /**
   * Navigate to Overview section - Scroll to section anchor
   */
  navigateToOverviewSection(sectionId: string): void {
    this.scrollToSection(sectionId);
  }

  /**
   * Navigate to Walkthrough section - Scroll to step anchor
   */
  navigateToWalkthroughSection(stepIndex: number): void {
    this.scrollToSection(`step-${stepIndex}`);
  }

  /**
   * Scroll to a specific section by element ID
   * @param elementId - The DOM element ID to scroll to
   */
  private scrollToSection(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      // Update URL hash for anchor support
      this.updateUrlHash(elementId);

      // Update active section for TOC highlighting
      this.uiStateService.setActiveSectionId(elementId);
      this.navigationEvent$.next({
        type: 'section-changed',
        sectionId: elementId
      });
    }
  }

  // ============================================================================
  // URL MANAGEMENT - Hash Navigation and Initial Load
  // ============================================================================

  /**
   * Update URL hash without triggering page reload
   */
  private updateUrlHash(sectionId: string): void {
    if (typeof window !== 'undefined' && window.history) {
      const currentUrl = window.location.pathname + window.location.search;
      const newUrl = `${currentUrl}#${sectionId}`;
      window.history.replaceState(null, '', newUrl);
    }
  }

  /**
   * Handle initial URL hash on page load
   * Uses requestAnimationFrame + optimized delay for better performance
   */
  handleInitialHash(): void {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash.slice(1); // Remove '#' prefix
    if (hash) {
      // Use requestAnimationFrame for optimal timing
      // Reduced delay from 300ms to 100ms for faster response
      requestAnimationFrame(() => {
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });

            // Update active section
            this.uiStateService.setActiveSectionId(hash);
            this.navigationEvent$.next({
              type: 'section-changed',
              sectionId: hash
            });
          }
        }, TIMING.INITIAL_HASH_DELAY);
      });
    }
  }

  // ============================================================================
  // LIFECYCLE - Resource Management and Cleanup
  // ============================================================================

  /**
   * Invalidate cached DOM queries
   * Call this when DOM structure changes (e.g., preview mode, content updates)
   */
  invalidateCache(): void {
    this.cachedSections = [];
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Remove scroll listener
    if (this.optimizedScrollListener) {
      window.removeEventListener('scroll', this.optimizedScrollListener);
      this.optimizedScrollListener = undefined;
    }

    // Disconnect intersection observer
    if (this.sectionObserver) {
      this.sectionObserver.disconnect();
      this.sectionObserver = undefined;
    }

    // Clear state
    this.visibleSections.clear();

    // Clear DOM cache
    this.invalidateCache();
  }
}
