import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

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

  // Scroll listener
  private optimizedScrollListener?: () => void;
  private scrollTicking: boolean = false;
  private userHasScrolled: boolean = false;

  // Intersection Observer
  private sectionObserver?: IntersectionObserver;
  private visibleSections = new Set<string>();

  // Current active section
  private activeSectionId: string = 'overview';

  constructor() { }

  /**
   * Get navigation events as observable
   */
  getNavigationEvents() {
    return this.navigationEvent$.asObservable();
  }

  /**
   * Get current active section ID
   */
  getActiveSectionId(): string {
    return this.activeSectionId;
  }

  /**
   * Check if user has scrolled
   */
  hasUserScrolled(): boolean {
    return this.userHasScrolled;
  }

  /**
   * Setup optimized scroll listener for section highlighting
   */
  setupOptimizedScrollListener(): void {
    if (typeof window === 'undefined') return;

    this.optimizedScrollListener = () => {
      // Mark that user has scrolled - this enables TOC highlighting
      if (!this.userHasScrolled) {
        this.userHasScrolled = true;
        this.navigationEvent$.next({ type: 'user-scrolled' });
      }

      if (!this.scrollTicking) {
        requestAnimationFrame(() => {
          this.handleOptimizedScroll();
          this.scrollTicking = false;
        });
        this.scrollTicking = true;
      }
    };

    window.addEventListener('scroll', this.optimizedScrollListener, { passive: true });
  }

  /**
   * Handle scroll events
   */
  private handleOptimizedScroll(): void {
    // Reserved for future scroll-based features if needed
  }

  /**
   * Setup Intersection Observer for automatic TOC highlighting
   */
  setupSectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '-80px 0px -60% 0px', // Account for header and focus on top sections
      threshold: 0
    };

    this.sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const sectionId = entry.target.id;
        if (entry.isIntersecting) {
          this.visibleSections.add(sectionId);
        } else {
          this.visibleSections.delete(sectionId);
        }
      });

      // Update active section to the first visible one
      if (this.visibleSections.size > 0) {
        const firstVisible = Array.from(this.visibleSections)[0];
        this.updateActiveSection(firstVisible);
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

    // Delay to ensure DOM is rendered
    setTimeout(() => {
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
    }, 100);
  }

  /**
   * Update active section for TOC highlighting
   */
  private updateActiveSection(sectionId: string): void {
    if (this.activeSectionId !== sectionId) {
      this.activeSectionId = sectionId;
      this.navigationEvent$.next({
        type: 'section-changed',
        sectionId: sectionId
      });
    }
  }

  /**
   * Navigate to Overview section - Scroll to section anchor
   */
  navigateToOverviewSection(sectionId: string): void {
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
      sectionElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      // Update URL hash for anchor support
      this.updateUrlHash(sectionId);

      // Update active section for TOC highlighting
      this.activeSectionId = sectionId;
      this.navigationEvent$.next({
        type: 'section-changed',
        sectionId: sectionId
      });
    }
  }

  /**
   * Navigate to Walkthrough section - Scroll to step anchor
   */
  navigateToWalkthroughSection(stepIndex: number): void {
    // Scroll to the step immediately
    this.scrollToStep(stepIndex);
    // Update URL hash for anchor support
    this.updateUrlHash(`step-${stepIndex}`);
  }

  /**
   * Scroll to a specific step by index
   */
  private scrollToStep(stepIndex: number): void {
    const stepElement = document.getElementById(`step-${stepIndex}`);
    if (stepElement) {
      stepElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      // Update active section for TOC highlighting
      const sectionId = `step-${stepIndex}`;
      this.activeSectionId = sectionId;
      this.navigationEvent$.next({
        type: 'section-changed',
        sectionId: sectionId
      });
    }
  }

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
   */
  handleInitialHash(): void {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash.slice(1); // Remove '#' prefix
    if (hash) {
      // Delay to ensure DOM is rendered
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });

          // Update active section
          this.activeSectionId = hash;
          this.navigationEvent$.next({
            type: 'section-changed',
            sectionId: hash
          });
        }
      }, 300);
    }
  }

  /**
   * Reset navigation state (when leaving recipe detail page)
   */
  reset(): void {
    this.activeSectionId = 'overview';
    this.userHasScrolled = false;
    this.visibleSections.clear();
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
    this.scrollTicking = false;
    this.userHasScrolled = false;
  }
}
