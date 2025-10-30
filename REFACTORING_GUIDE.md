# RecipesComponent 完整重构指南

## 📊 重构概况

- **原始文件大小**: 1,415 行
- **目标**: 减少到 ~500 行（减少 65%）
- **方法**: 创建 4 个服务 + 3 个子组件
- **预计时间**: 5-7 天

---

## ✅ Step 1: RecipeTocService 集成 (已完成创建)

### 1.1 文件已创建
- ✅ `src/app/shared/services/recipe-toc.service.ts` (430 行)

### 1.2 在 recipes.component.ts 中集成

#### A. 添加导入 (在第 24 行后添加)
```typescript
import { RecipeTocService } from '../shared/services/recipe-toc.service';
```

#### B. 注入服务 (修改构造函数，第 113-119 行)
```typescript
constructor(
  private route: ActivatedRoute,
  private router: Router,
  private recipeService: RecipeService,
  private previewService: RecipePreviewService,
  private cdr: ChangeDetectorRef,
  private recipeTocService: RecipeTocService  // 新增
) {}
```

#### C. 更新方法调用

##### 在 loadRecipe() 方法中 (约第 349行)
**替换**:
```typescript
this.generateRecipeTOCStructure();
```
**为**:
```typescript
this.recipeTocService.setCurrentRecipe(this.currentRecipe);
this.recipeTOC = this.recipeTocService.generateRecipeTOCStructure();
```

##### 在 loadPreviewRecipe() 方法中 (约第 379行)
**替换**:
```typescript
this.generateRecipeTOCStructure();
```
**为**:
```typescript
this.recipeTocService.setCurrentRecipe(this.currentRecipe);
this.recipeTOC = this.recipeTocService.generateRecipeTOCStructure();
```

##### 在 updatePreviewContent() 方法中 (约第 444行)
**替换**:
```typescript
this.generateRecipeTOCStructure();
```
**为**:
```typescript
this.recipeTocService.setCurrentRecipe(this.currentRecipe);
this.recipeTOC = this.recipeTocService.generateRecipeTOCStructure();
```

##### 更新 getVisibleOverviewSections() 方法 (约第 865行)
**替换整个方法**:
```typescript
getVisibleOverviewSections() {
  return this.recipeTocService.getVisibleOverviewSections();
}
```

##### 更新 getOverviewSectionsForTOC() 方法 (约第 1005行)
**找到这部分**:
```typescript
const overviewTab = this.recipeTOC.tabs.find(tab => tab.id === 'overview');
return overviewTab?.sections || [];
```
**替换为**:
```typescript
return this.recipeTocService.getOverviewSectionsForTOC();
```

##### 更新 getWalkthroughSectionsForTOC() 方法 (约第 1013行)
**找到这部分**:
```typescript
const walkthroughTab = this.recipeTOC.tabs.find(tab => tab.id === 'walkthrough');
return walkthroughTab?.sections || [];
```
**替换为**:
```typescript
return this.recipeTocService.getWalkthroughSectionsForTOC();
```

##### 更新 downloadExecutable() 方法 (约第 1313-1343行)
**在方法开头添加**:
```typescript
// Use service's buildAssetPath if needed
const normalizedUrl = url.replace(/[\u2010-\u2015]/g, '_');
```

#### D. 删除已迁移的方法

删除以下方法（约第 738-892 行）:
- `generateRecipeTOCStructure()`
- `overviewSectionConfigs` 属性
- `generateOverviewSections()`
- `generateWalkthroughSections()`
- `hasValidOverview()`
- `hasValidWhenToUse()`
- `hasArrayPrerequisites()`
- `getPermissionSetsForBuilding()`
- `getPermissionSetsForUsing()`
- `hasValidDownloadableExecutables()`
- `getValidDownloadableExecutables()`
- `hasValidRelatedRecipes()`
- `getValidRelatedRecipes()`
- `getValidPrerequisites()`
- `buildAssetPath()`

**注意**: 保留 `getVisibleOverviewSections()` 和 TOC 导航方法，但修改为调用服务。

### 1.3 测试验证清单
- [ ] Recipe 详情页加载正常
- [ ] TOC 显示正确的 Overview sections
- [ ] TOC 显示正确的 Walkthrough sections
- [ ] Section 可见性判断正确
- [ ] 点击 TOC 导航正常
- [ ] 下载功能正常
- [ ] 预览模式正常

### 1.4 预期结果
- recipes.component.ts 减少约 350-400 行
- 新增一个独立的 TOC 服务

---

## 🚀 Step 2: RecipeNavigationService

### 2.1 创建服务文件
文件路径: `src/app/shared/services/recipe-navigation.service.ts`

### 2.2 服务内容

```typescript
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Service responsible for recipe navigation, scrolling, and section tracking
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeNavigationService {
  private activeSectionId: string = 'overview';
  private userHasScrolled: boolean = false;
  private scrollTicking: boolean = false;
  private optimizedScrollListener?: () => void;
  private sectionObserver?: IntersectionObserver;
  private visibleSections = new Set<string>();

  // Observable for active section changes
  private activeSectionChange$ = new Subject<string>();

  getActiveSectionId(): string {
    return this.activeSectionId;
  }

  setActiveSectionId(id: string): void {
    this.activeSectionId = id;
    this.activeSectionChange$.next(id);
  }

  onActiveSectionChange() {
    return this.activeSectionChange$.asObservable();
  }

  /**
   * Setup optimized scroll listener for section highlighting
   */
  setupOptimizedScrollListener(callback: () => void): void {
    if (typeof window === 'undefined') return;

    this.optimizedScrollListener = () => {
      if (!this.userHasScrolled) {
        this.userHasScrolled = true;
      }

      if (!this.scrollTicking) {
        requestAnimationFrame(() => {
          callback();
          this.scrollTicking = false;
        });
        this.scrollTicking = true;
      }
    };

    window.addEventListener('scroll', this.optimizedScrollListener, { passive: true });
  }

  /**
   * Setup Intersection Observer for sections
   */
  setupSectionObserver(
    rootMargin: string,
    threshold: number,
    callback: (entries: IntersectionObserverEntry[]) => void
  ): void {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const options = {
      root: null,
      rootMargin,
      threshold
    };

    this.sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.visibleSections.add(entry.target.id);
        } else {
          this.visibleSections.delete(entry.target.id);
        }
      });
      callback(entries);
    }, options);
  }

  /**
   * Observe element
   */
  observeElement(element: Element): void {
    if (this.sectionObserver) {
      this.sectionObserver.observe(element);
    }
  }

  /**
   * Update active section based on visible sections
   */
  updateActiveSection(sections: string[]): void {
    if (sections.length > 0) {
      const firstVisibleSection = sections[0];
      if (firstVisibleSection !== this.activeSectionId) {
        this.setActiveSectionId(firstVisibleSection);
      }
    }
  }

  /**
   * Scroll to element with offset
   */
  scrollToElement(elementId: string, offset: number = 0): void {
    const element = document.getElementById(elementId);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Update URL hash without triggering navigation
   */
  updateUrlHash(hash: string): void {
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      const newUrl = `${window.location.pathname}${window.location.search}#${hash}`;
      window.history.replaceState(null, '', newUrl);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.optimizedScrollListener) {
      window.removeEventListener('scroll', this.optimizedScrollListener);
      this.optimizedScrollListener = undefined;
    }

    if (this.sectionObserver) {
      this.sectionObserver.disconnect();
      this.sectionObserver = undefined;
    }

    this.visibleSections.clear();
  }
}
```

### 2.3 集成到 recipes.component.ts

#### A. 添加导入
```typescript
import { RecipeNavigationService } from '../shared/services/recipe-navigation.service';
```

#### B. 注入服务
```typescript
constructor(
  // ... existing services
  private recipeNavigationService: RecipeNavigationService
) {}
```

#### C. 更新方法调用

在 `ngOnInit()` 中:
```typescript
this.setupNavigationService();
```

添加新方法:
```typescript
private setupNavigationService(): void {
  this.recipeNavigationService.setupOptimizedScrollListener(() => {
    this.handleOptimizedScroll();
  });

  this.recipeNavigationService.setupSectionObserver(
    '-10% 0px -89% 0px',
    0.1,
    (entries) => {
      // Update active section logic
    }
  );

  // Subscribe to active section changes
  this.recipeNavigationService.onActiveSectionChange()
    .pipe(takeUntil(this.destroy$))
    .subscribe(sectionId => {
      this.ui.activeSectionId = sectionId;
      this.recipeTOC.currentSectionId = sectionId;
      this.cdr.markForCheck();
    });
}
```

在 `ngOnDestroy()` 中:
```typescript
this.recipeNavigationService.cleanup();
```

#### D. 删除已迁移的方法
- `setupOptimizedScrollListener()`
- `handleOptimizedScroll()`
- `setupSectionObserver()`
- `updateActiveSection()`
- `scrollToStep()`
- `updateUrlHash()`
- 相关的滚动和观察器变量

### 2.4 测试验证清单
- [ ] 滚动时 TOC 高亮正确
- [ ] 点击 TOC 导航到正确位置
- [ ] URL hash 更新正常
- [ ] 无内存泄漏（检查 devtools）
- [ ] 响应式滚动流畅

---

## 🎯 Step 3: RecipeUiStateService

### 3.1 创建服务文件
文件路径: `src/app/shared/services/recipe-ui-state.service.ts`

### 3.2 服务内容

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UIState {
  isLoading: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  isMobile: boolean;
  currentView: 'home' | 'category' | 'recipe';
  isPreviewMode: boolean;
  tocHidden: boolean;
  activeSectionId: string;
  userHasScrolled: boolean;
  scrollTicking: boolean;
}

const SIDEBAR_STATE_KEY = 'recipe-sidebar-collapsed';
const initialState: UIState = {
  isLoading: false,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  isMobile: false,
  currentView: 'home',
  isPreviewMode: false,
  tocHidden: false,
  activeSectionId: 'overview',
  userHasScrolled: false,
  scrollTicking: false
};

@Injectable({
  providedIn: 'root'
})
export class RecipeUiStateService {
  private uiState$ = new BehaviorSubject<UIState>(initialState);

  constructor() {
    this.loadSidebarState();
  }

  /**
   * Get UI state as observable
   */
  getState(): Observable<UIState> {
    return this.uiState$.asObservable();
  }

  /**
   * Get current state value
   */
  getCurrentState(): UIState {
    return this.uiState$.value;
  }

  /**
   * Update UI state
   */
  updateState(updates: Partial<UIState>): void {
    const currentState = this.uiState$.value;
    this.uiState$.next({
      ...currentState,
      ...updates
    });
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar(): void {
    const collapsed = !this.uiState$.value.sidebarCollapsed;
    this.updateState({ sidebarCollapsed: collapsed });
    this.saveSidebarState(collapsed);
  }

  /**
   * Toggle mobile sidebar
   */
  toggleMobileSidebar(): void {
    this.updateState({
      mobileSidebarOpen: !this.uiState$.value.mobileSidebarOpen
    });
  }

  /**
   * Close mobile sidebar
   */
  closeMobileSidebar(): void {
    this.updateState({ mobileSidebarOpen: false });
  }

  /**
   * Check if mobile view
   */
  checkMobileView(): void {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 992;
      this.updateState({ isMobile });
    }
  }

  /**
   * Load sidebar state from localStorage
   */
  private loadSidebarState(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedState = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (savedState !== null) {
        this.updateState({ sidebarCollapsed: savedState === 'true' });
      }
    }
  }

  /**
   * Save sidebar state to localStorage
   */
  private saveSidebarState(collapsed: boolean): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SIDEBAR_STATE_KEY, collapsed.toString());
    }
  }
}
```

### 3.3 集成到 recipes.component.ts

#### A. 添加导入
```typescript
import { RecipeUiStateService } from '../shared/services/recipe-ui-state.service';
```

#### B. 注入服务并订阅状态
```typescript
constructor(
  // ... existing services
  private uiStateService: RecipeUiStateService
) {}

ngOnInit(): void {
  // Subscribe to UI state
  this.uiStateService.getState()
    .pipe(takeUntil(this.destroy$))
    .subscribe(state => {
      this.ui = state;
      this.cdr.markForCheck();
    });

  // ... rest of initialization
}
```

#### C. 更新方法调用
```typescript
toggleSidebar(): void {
  this.uiStateService.toggleSidebar();
}

toggleMobileSidebar(): void {
  this.uiStateService.toggleMobileSidebar();
}

closeMobileSidebar(): void {
  this.uiStateService.closeMobileSidebar();
}
```

#### D. 删除已迁移的内容
- `UIState` 接口定义（移到服务）
- `loadSidebarState()` 方法
- 手动的 UI 状态更新逻辑

### 3.4 测试验证清单
- [ ] Sidebar 展开/折叠正常
- [ ] Mobile sidebar 正常
- [ ] 状态持久化到 localStorage
- [ ] 响应式状态更新正确

---

## 📱 Step 4-7: 子组件拆分

由于篇幅限制，子组件拆分的详细步骤请参考初始分析报告。

关键步骤：
1. 使用 `ng generate component` 创建组件
2. 移动相关模板代码
3. 定义 @Input/@Output
4. 更新主组件模板
5. 测试验证

---

## 🔍 常见问题与解决方案

### Q1: 服务注入后报错找不到模块
**A**: 确保服务文件在正确的位置，并且 `@Injectable({ providedIn: 'root' })` 已设置。

### Q2: ChangeDetection 不触发
**A**: 在服务中更新状态后，在组件中调用 `this.cdr.markForCheck()`。

### Q3: Intersection Observer 不工作
**A**: 检查元素是否有正确的 ID，并且在 DOM 中存在。

### Q4: 内存泄漏
**A**: 确保在 `ngOnDestroy` 中调用服务的 `cleanup()` 方法，并且所有订阅都使用 `takeUntil(this.destroy$)`。

---

## 📊 进度跟踪

- [x] Step 1: RecipeTocService (创建完成，待集成)
- [ ] Step 2: RecipeNavigationService
- [ ] Step 3: RecipeUiStateService
- [ ] Step 4: RecipePreviewSyncService
- [ ] Step 5: RecipeSidebarComponent
- [ ] Step 6: RecipeTocComponent
- [ ] Step 7: RecipeDetailContentComponent
- [ ] Step 8: 清理和优化
- [ ] Step 9: 完整测试

---

## ✅ 最终验证清单

完成所有重构后，验证以下功能：

### 基本功能
- [ ] Home 视图加载
- [ ] Category 列表显示
- [ ] Recipe 详情加载
- [ ] 搜索功能
- [ ] 预览模式

### 导航功能
- [ ] Sidebar 导航
- [ ] TOC 导航
- [ ] 面包屑导航
- [ ] 锚点跳转
- [ ] URL hash 更新

### 交互功能
- [ ] 滚动高亮
- [ ] 点击导航
- [ ] 下载文件
- [ ] 复制到剪贴板
- [ ] 搜索 overlay

### 响应式
- [ ] Desktop 布局
- [ ] Tablet 布局
- [ ] Mobile 布局
- [ ] Sidebar 响应式

### 性能
- [ ] 首次加载时间
- [ ] 路由切换速度
- [ ] 滚动流畅度
- [ ] 无内存泄漏

---

## 🎉 完成后的收益

- **代码量减少**: 1,415 → ~500 行（65%）
- **可维护性**: 大幅提升
- **可测试性**: 每个服务和组件独立测试
- **可复用性**: 服务可在其他地方使用
- **职责清晰**: 每个文件只负责一件事

---

## 📚 参考资源

- [Angular Service](https://angular.io/guide/architecture-services)
- [Angular Component Interaction](https://angular.io/guide/component-interaction)
- [RxJS BehaviorSubject](https://rxjs.dev/api/index/class/BehaviorSubject)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

---

**祝你重构顺利！如有问题，随时参考本指南。**
