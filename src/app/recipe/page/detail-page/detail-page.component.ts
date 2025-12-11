import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  HostListener
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, combineLatest, fromEvent } from 'rxjs';
import { takeUntil, throttleTime } from 'rxjs/operators';

import { Recipe, Category } from '../../core/models/recipe.model';
import { CacheService } from '../../core/services/cache.service';
import { SearchService } from '../../core/services/search.service';
import { BreadcrumbItem } from '../detail-banner/detail-banner.component';

interface CategoryGroup {
  category: Category;
  recipes: Recipe[];
  isExpanded: boolean;
}

@Component({
  selector: 'app-recipe-detail-page',
  templateUrl: './detail-page.component.html',
  styleUrls: ['./detail-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  currentRecipe: Recipe | null = null;
  breadcrumbs: BreadcrumbItem[] = [];

  // Sidebar category groups
  categoryGroups: CategoryGroup[] = [];
  filteredCategoryGroups: CategoryGroup[] = [];
  sidebarSearchQuery: string = '';
  allRecipes: Recipe[] = [];
  allCategories: Category[] = [];

  // Active TOC section
  activeTocSection: string = 'overview';
  private isScrollingToSection: boolean = false;

  // Media preview modal
  isMediaModalOpen: boolean = false;
  previewMedia: { type: string; url: string; alt: string } | null = null;

  @ViewChild('sidebarSearchInput') sidebarSearchInput!: ElementRef<HTMLInputElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cacheService: CacheService,
    private searchService: SearchService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Get route params and load recipe
    combineLatest([
      this.route.paramMap,
      this.cacheService.getRecipes$()
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([params, recipes]) => {
      const category = params.get('category');
      const recipeName = params.get('recipeName');

      this.allRecipes = recipes;
      this.allCategories = this.searchService.generateCategories(recipes);

      // Build category groups
      this.buildCategoryGroups();

      if (category && recipeName) {
        // Find the recipe by category and slug
        const recipe = recipes.find(r =>
          r.category === category && r.slug === recipeName
        );

        if (recipe) {
          this.currentRecipe = recipe;

          // Build breadcrumb path
          this.breadcrumbs = [
            { name: 'Recipes', url: '/recipes' },
            { name: recipe.category, url: `/recipes/${recipe.category}` }
          ];

          // Expand the current category
          this.expandCategory(recipe.category);

          this.cdr.markForCheck();

          // Setup scroll listener for TOC after a short delay to ensure DOM is ready
          setTimeout(() => this.setupScrollListener(), 100);
        } else {
          // Recipe not found, redirect to recipes list
          this.router.navigate(['/recipes']);
        }
      }
    });
  }

  private buildCategoryGroups(): void {
    this.categoryGroups = this.allCategories.map(category => ({
      category,
      recipes: this.allRecipes.filter(r => r.category === category.name),
      isExpanded: false
    }));
    this.filteredCategoryGroups = [...this.categoryGroups];
  }

  private expandCategory(categoryName: string): void {
    const group = this.categoryGroups.find(g => g.category.name === categoryName);
    if (group) {
      group.isExpanded = true;
    }
  }

  toggleCategory(categoryName: string): void {
    const group = this.filteredCategoryGroups.find(g => g.category.name === categoryName);
    if (group) {
      group.isExpanded = !group.isExpanded;
      this.cdr.markForCheck();
    }
  }

  onSidebarSearchInput(): void {
    const query = this.sidebarSearchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredCategoryGroups = [...this.categoryGroups];
    } else {
      // Filter recipes and expand categories with matching recipes
      this.filteredCategoryGroups = this.categoryGroups.map(group => {
        const filteredRecipes = group.recipes.filter(recipe =>
          recipe.title.toLowerCase().includes(query)
        );
        return {
          ...group,
          recipes: filteredRecipes,
          isExpanded: filteredRecipes.length > 0 ? true : group.isExpanded
        };
      }).filter(group => group.recipes.length > 0);
    }

    this.cdr.markForCheck();
  }

  @HostListener('document:keydown./', ['$event'])
  onSlashKey(event: Event) {
    // Check if the search input is not already focused
    if (document.activeElement !== this.sidebarSearchInput?.nativeElement) {
      event.preventDefault();
      if (this.sidebarSearchInput) {
        this.sidebarSearchInput.nativeElement.focus();
      }
    }
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();

    // Set the active section immediately
    this.activeTocSection = sectionId;
    this.isScrollingToSection = true;
    this.cdr.markForCheck();

    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80; // Offset for fixed header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Re-enable scroll tracking after smooth scroll completes
      setTimeout(() => {
        this.isScrollingToSection = false;
      }, 1000);
    }
  }

  getDownloadFileName(file: any): string {
    // If title exists, return it
    if (file.title) {
      return file.title;
    }

    // Extract filename from filePath
    const filePath = file.filePath || file.url || '';
    const fileName = filePath.split('/').pop() || 'Download File';

    // Remove .json extension and replace underscores with spaces
    return fileName.replace('.json', '').replace(/_/g, ' ');
  }

  getGeneralUseCaseItems(): string[] {
    if (!this.currentRecipe?.generalUseCase) {
      return [];
    }
    // Split by \n and filter out empty strings
    return this.currentRecipe.generalUseCase
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  shouldShowRulesEngine(): boolean {
    if (!this.currentRecipe) {
      return false;
    }
    // Show Rules Engine section if category is not 'Transformation'
    return this.currentRecipe.category.toLowerCase() !== 'transformation';
  }

  private setupScrollListener(): void {
    fromEvent(window, 'scroll')
      .pipe(
        throttleTime(100),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateActiveTocSection();
      });

    // Initial check
    this.updateActiveTocSection();
  }

  private updateActiveTocSection(): void {
    if (!this.currentRecipe || this.isScrollingToSection) return;

    const sections = [
      'overview',
      'use-case',
      'rules-engine',
      'direction',
      'pipeline',
      'walkthrough',
      'verification-gif',
      'download-file'
    ];

    // Find which section is currently most visible in the viewport
    const viewportMiddle = window.scrollY + window.innerHeight / 3;
    let activeSection = 'overview';
    let closestDistance = Infinity;

    for (const sectionId of sections) {
      const element = document.getElementById(sectionId);
      if (element) {
        const rect = element.getBoundingClientRect();
        const elementTop = window.scrollY + rect.top;
        const elementBottom = elementTop + rect.height;

        // Check if section is in viewport
        if (elementTop <= viewportMiddle && elementBottom >= window.scrollY) {
          const distance = Math.abs(elementTop - window.scrollY);
          if (distance < closestDistance) {
            closestDistance = distance;
            activeSection = sectionId;
          }
        }
      }
    }

    if (this.activeTocSection !== activeSection) {
      this.activeTocSection = activeSection;
      this.cdr.markForCheck();
    }
  }

  openMediaPreview(media: any): void {
    this.previewMedia = {
      type: media.type,
      url: media.displayUrl || media.url,
      alt: media.alt || ''
    };
    this.isMediaModalOpen = true;
    this.cdr.markForCheck();
  }

  closeMediaPreview(): void {
    this.isMediaModalOpen = false;
    this.previewMedia = null;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isMediaModalOpen) {
      this.closeMediaPreview();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
