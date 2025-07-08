# FAQ System Documentation | FAQ系统文档

## English | 英文

### Overview
This document provides comprehensive documentation for the FAQ (Frequently Asked Questions) system implementation. The system is built with Angular and provides multiple rendering strategies for optimal performance across different data sizes.

### System Architecture

#### Core Components
- **Main FAQ Component** (`faq.component.ts`) - Primary FAQ display with accordion interface
- **Paginated FAQ Component** (`paginated-faq.component.ts`) - Pagination-based rendering for medium datasets
- **Virtual Scroll FAQ Component** (`virtual-scroll-faq.component.ts`) - Virtual scrolling for large datasets
- **FAQ Service** (`faq.service.ts`) - Centralized data management and caching
- **FAQ Models** (`faq.model.ts`) - TypeScript interfaces and types

#### Key Features
- **Multi-Strategy Rendering**: Automatic selection between basic, paginated, and virtual scroll rendering
- **Real-time Search**: Debounced search with suggestions and highlighting
- **Content Caching**: Intelligent caching of FAQ content for performance
- **Responsive Design**: Mobile-first design with touch-friendly interactions
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support
- **Analytics Integration**: User interaction tracking for insights

#### Technical Stack
- **Framework**: Angular 15+
- **UI Components**: Angular Material
- **Virtual Scrolling**: Angular CDK
- **Styling**: SCSS with responsive design
- **State Management**: RxJS Observables
- **Content Security**: DomSanitizer for safe HTML rendering

### File Structure
```
src/app/faq/
├── faq.component.ts              # Main FAQ component (1000+ lines)
├── faq.component.html            # Main FAQ template
├── faq.component.scss            # Main FAQ styles (800+ lines)
├── faq.module.ts                 # FAQ module configuration
├── faq-home/                     # FAQ home page component
│   ├── faq-home.component.ts
│   ├── faq-home.component.html
│   └── faq-home.component.scss
├── paginated-faq.component.ts    # Paginated FAQ component (540+ lines)
├── paginated-faq.component.scss  # Paginated FAQ styles
├── virtual-scroll-faq.component.ts # Virtual scroll component (290+ lines)
├── virtual-scroll-faq.component.scss # Virtual scroll styles
└── move-html.js                  # Utility script

src/app/shared/
├── models/
│   └── faq.model.ts              # FAQ data models and interfaces
└── services/
    └── faq.service.ts            # FAQ data service (380+ lines)

src/assets/data/
└── faqs.json                     # FAQ data source (1500+ entries)
```

### Data Models

#### Core Interfaces
```typescript
// Primary FAQ item interface
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  answerPath?: string;
  safeAnswer?: SafeHtml;
  category: string;
  subCategory: string | null;
  isExpanded?: boolean;
  userRating?: boolean | null;
  viewCount?: number;
  isPopular?: boolean;
  tags?: string[];
  lastUpdated?: Date;
  showSocialShare?: boolean;
}

// Category structure
export interface FAQCategory {
  name: string;
  count: number;
  subCategories: FAQSubCategory[];
}

// Pagination information
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}
```

### Performance Optimization

#### Rendering Strategies
1. **Basic Rendering** (< 100 items): Standard Angular *ngFor with Material Accordion
2. **Paginated Rendering** (100-500 items): Client-side pagination with configurable page sizes
3. **Virtual Scrolling** (500+ items): CDK Virtual Scrolling for optimal performance

#### Caching Strategy
- **Content Caching**: FAQ answers cached in memory after first load
- **Search Results**: Debounced search with 300ms delay
- **Category Data**: Categories cached after initial load

#### Bundle Size Optimization
- **Lazy Loading**: FAQ module loaded on demand
- **Tree Shaking**: Unused code eliminated during build
- **Asset Optimization**: Images and content optimized for web delivery

---

## 中文 | Chinese

### 概述
本文档为FAQ（常见问题）系统实现提供全面的文档说明。该系统基于Angular构建，提供多种渲染策略以在不同数据规模下实现最佳性能。

### 系统架构

#### 核心组件
- **主FAQ组件** (`faq.component.ts`) - 主要的FAQ显示界面，使用手风琴界面
- **分页FAQ组件** (`paginated-faq.component.ts`) - 基于分页的渲染，适用于中等数据集
- **虚拟滚动FAQ组件** (`virtual-scroll-faq.component.ts`) - 虚拟滚动，适用于大型数据集
- **FAQ服务** (`faq.service.ts`) - 集中式数据管理和缓存
- **FAQ模型** (`faq.model.ts`) - TypeScript接口和类型定义

#### 主要功能
- **多策略渲染**: 在基础、分页和虚拟滚动渲染之间自动选择
- **实时搜索**: 带有建议和高亮显示的防抖搜索
- **内容缓存**: 智能缓存FAQ内容以提升性能
- **响应式设计**: 移动优先设计，支持触摸友好的交互
- **无障碍访问**: ARIA标签、键盘导航和屏幕阅读器支持
- **分析集成**: 用户交互跟踪以获取洞察

#### 技术栈
- **框架**: Angular 15+
- **UI组件**: Angular Material
- **虚拟滚动**: Angular CDK
- **样式**: SCSS响应式设计
- **状态管理**: RxJS Observables
- **内容安全**: DomSanitizer安全HTML渲染

### 文件结构
```
src/app/faq/
├── faq.component.ts              # 主FAQ组件 (1000+行)
├── faq.component.html            # 主FAQ模板
├── faq.component.scss            # 主FAQ样式 (800+行)
├── faq.module.ts                 # FAQ模块配置
├── faq-home/                     # FAQ首页组件
│   ├── faq-home.component.ts
│   ├── faq-home.component.html
│   └── faq-home.component.scss
├── paginated-faq.component.ts    # 分页FAQ组件 (540+行)
├── paginated-faq.component.scss  # 分页FAQ样式
├── virtual-scroll-faq.component.ts # 虚拟滚动组件 (290+行)
├── virtual-scroll-faq.component.scss # 虚拟滚动样式
└── move-html.js                  # 工具脚本

src/app/shared/
├── models/
│   └── faq.model.ts              # FAQ数据模型和接口
└── services/
    └── faq.service.ts            # FAQ数据服务 (380+行)

src/assets/data/
└── faqs.json                     # FAQ数据源 (1500+条目)
```

### 数据模型

#### 核心接口
```typescript
// 主要FAQ项目接口
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  answerPath?: string;
  safeAnswer?: SafeHtml;
  category: string;
  subCategory: string | null;
  isExpanded?: boolean;
  userRating?: boolean | null;
  viewCount?: number;
  isPopular?: boolean;
  tags?: string[];
  lastUpdated?: Date;
  showSocialShare?: boolean;
}

// 分类结构
export interface FAQCategory {
  name: string;
  count: number;
  subCategories: FAQSubCategory[];
}

// 分页信息
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}
```

### 性能优化

#### 渲染策略
1. **基础渲染** (< 100项): 标准Angular *ngFor配合Material手风琴
2. **分页渲染** (100-500项): 客户端分页，可配置页面大小
3. **虚拟滚动** (500+项): CDK虚拟滚动以获得最佳性能

#### 缓存策略
- **内容缓存**: FAQ答案在首次加载后缓存在内存中
- **搜索结果**: 300ms延迟的防抖搜索
- **分类数据**: 分类在初始加载后缓存

#### 包大小优化
- **懒加载**: FAQ模块按需加载
- **Tree Shaking**: 构建时消除未使用的代码
- **资源优化**: 图片和内容针对Web交付进行优化

---

## Implementation Details | 实现细节

### English | 英文

#### Search Functionality
The search system implements a sophisticated debounced search with the following features:

**Search Features:**
- **Real-time Suggestions**: Dropdown suggestions appear as user types
- **Keyword Highlighting**: Search terms highlighted in results using `<mark>` tags
- **Keyboard Navigation**: Arrow keys for suggestion selection, Enter to confirm, Escape to close
- **Keyboard Shortcut**: Press `/` key to quickly focus search box
- **Debounce Optimization**: 300ms debounce for improved search performance
- **Smart Suggestions**: Shows category information, limited to 8 suggestions

**Search Implementation:**
```typescript
// Search debounce setup
private setupSearchDebounce(): void {
  this.searchSubject.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    takeUntil(this.destroy$)
  ).subscribe(query => {
    this.performSearch(query);
  });
}

// Search across multiple fields
searchFAQs(query: string, options: SearchOptions = {}): Observable<FAQItem[]> {
  return this.getFAQs().pipe(
    map(faqs => {
      const lowerQuery = query.toLowerCase();
      return faqs.filter(faq => {
        const questionMatch = faq.question.toLowerCase().includes(lowerQuery);
        const categoryMatch = faq.category.toLowerCase().includes(lowerQuery);
        const subCategoryMatch = faq.subCategory?.toLowerCase().includes(lowerQuery);
        const tagsMatch = faq.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));

        return questionMatch || categoryMatch || subCategoryMatch || tagsMatch;
      });
    })
  );
}
```

#### Content Management
The system uses a sophisticated content loading and caching strategy:

**Content Loading Process:**
1. **Initial Load**: FAQ metadata loaded from JSON file
2. **Lazy Content**: FAQ answers loaded on-demand when expanded
3. **Content Processing**: HTML content sanitized and processed for security
4. **Caching**: Processed content cached in memory for subsequent access

**Content Security:**
```typescript
// Safe HTML processing
getFAQContent(answerPath: string): Observable<SafeHtml> {
  return this.http.get(fullPath, { responseType: 'text' }).pipe(
    map(content => {
      const processedContent = this.processContent(content);
      const safeContent = this.sanitizer.bypassSecurityTrustHtml(processedContent);

      // Cache content
      this.contentCache.set(answerPath, safeContent);
      return safeContent;
    })
  );
}

// Content processing for security and formatting
private processContent(content: string): string {
  return content
    // Remove empty p tags but preserve content structure
    .replace(/<p[^>]*>\s*<\/p>/g, '')
    // Fix image paths - ensure relative paths are correctly resolved
    .replace(/src="assets\//g, 'src="assets/')
    .replace(/src="(?!http|\/|assets)/g, 'src="assets/')
    // Improve content formatting
    .replace(/<section[^>]*>/g, '<div class="faq-section">')
    .replace(/<\/section>/g, '</div>')
    // Ensure images have correct style classes
    .replace(/<img([^>]*?)>/g, '<img$1 class="faq-image">')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
```

#### Virtual Scrolling Implementation
For large datasets (500+ items), the system uses Angular CDK Virtual Scrolling:

**Virtual Scroll Features:**
- **Dynamic Height**: Items can have different heights when expanded
- **Buffer Management**: Configurable buffer size for smooth scrolling
- **Performance**: Renders only visible items, maintaining 60fps
- **Memory Efficient**: Constant memory usage regardless of dataset size

**Virtual Scroll Configuration:**
```typescript
// Virtual scroll setup
<cdk-virtual-scroll-viewport
  #viewport
  [itemSize]="itemHeight"
  [minBufferPx]="bufferSize"
  [maxBufferPx]="bufferSize * 2"
  class="faq-viewport"
  (scrolledIndexChange)="onScrollIndexChange($event)"
>
  <div *cdkVirtualFor="let item of displayedItems; trackBy: trackByFn">
    <!-- FAQ content -->
  </div>
</cdk-virtual-scroll-viewport>

// Dynamic height calculation
toggleFAQ(item: VirtualFAQItem, index: number): void {
  item.isExpanded = !item.isExpanded;

  // Dynamically adjust item height
  if (item.isExpanded) {
    item.height = this.calculateExpandedHeight(item);
  } else {
    item.height = this.itemHeight;
  }

  // Notify virtual scroll to update
  this.viewport.checkViewportSize();
}
```

---

### 中文 | Chinese

#### 搜索功能
搜索系统实现了复杂的防抖搜索，具有以下功能：

**搜索特性:**
- **实时建议**: 用户输入时显示下拉建议
- **关键词高亮**: 使用`<mark>`标签在结果中高亮搜索词
- **键盘导航**: 方向键选择建议，Enter确认，Escape关闭
- **键盘快捷键**: 按`/`键快速聚焦搜索框
- **防抖优化**: 300ms防抖提升搜索性能
- **智能建议**: 显示分类信息，限制为8个建议

**搜索实现:**
```typescript
// 搜索防抖设置
private setupSearchDebounce(): void {
  this.searchSubject.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    takeUntil(this.destroy$)
  ).subscribe(query => {
    this.performSearch(query);
  });
}

// 跨多个字段搜索
searchFAQs(query: string, options: SearchOptions = {}): Observable<FAQItem[]> {
  return this.getFAQs().pipe(
    map(faqs => {
      const lowerQuery = query.toLowerCase();
      return faqs.filter(faq => {
        const questionMatch = faq.question.toLowerCase().includes(lowerQuery);
        const categoryMatch = faq.category.toLowerCase().includes(lowerQuery);
        const subCategoryMatch = faq.subCategory?.toLowerCase().includes(lowerQuery);
        const tagsMatch = faq.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));

        return questionMatch || categoryMatch || subCategoryMatch || tagsMatch;
      });
    })
  );
}
```

#### 内容管理
系统使用复杂的内容加载和缓存策略：

**内容加载过程:**
1. **初始加载**: 从JSON文件加载FAQ元数据
2. **懒加载内容**: FAQ答案在展开时按需加载
3. **内容处理**: HTML内容经过安全处理和净化
4. **缓存**: 处理后的内容缓存在内存中供后续访问

**内容安全:**
```typescript
// 安全HTML处理
getFAQContent(answerPath: string): Observable<SafeHtml> {
  return this.http.get(fullPath, { responseType: 'text' }).pipe(
    map(content => {
      const processedContent = this.processContent(content);
      const safeContent = this.sanitizer.bypassSecurityTrustHtml(processedContent);

      // 缓存内容
      this.contentCache.set(answerPath, safeContent);
      return safeContent;
    })
  );
}

// 内容处理以确保安全性和格式化
private processContent(content: string): string {
  return content
    // 移除空的p标签但保留内容结构
    .replace(/<p[^>]*>\s*<\/p>/g, '')
    // 修复图片路径 - 确保相对路径正确解析
    .replace(/src="assets\//g, 'src="assets/')
    .replace(/src="(?!http|\/|assets)/g, 'src="assets/')
    // 改进内容格式
    .replace(/<section[^>]*>/g, '<div class="faq-section">')
    .replace(/<\/section>/g, '</div>')
    // 确保图片有正确的样式类
    .replace(/<img([^>]*?)>/g, '<img$1 class="faq-image">')
    // 清理多余的空白
    .replace(/\s+/g, ' ')
    .trim();
}
```

#### 虚拟滚动实现
对于大型数据集（500+项），系统使用Angular CDK虚拟滚动：

**虚拟滚动特性:**
- **动态高度**: 展开时项目可以有不同的高度
- **缓冲区管理**: 可配置的缓冲区大小以实现平滑滚动
- **性能**: 仅渲染可见项目，保持60fps
- **内存高效**: 无论数据集大小如何，内存使用量恒定

**虚拟滚动配置:**
```typescript
// 虚拟滚动设置
<cdk-virtual-scroll-viewport
  #viewport
  [itemSize]="itemHeight"
  [minBufferPx]="bufferSize"
  [maxBufferPx]="bufferSize * 2"
  class="faq-viewport"
  (scrolledIndexChange)="onScrollIndexChange($event)"
>
  <div *cdkVirtualFor="let item of displayedItems; trackBy: trackByFn">
    <!-- FAQ内容 -->
  </div>
</cdk-virtual-scroll-viewport>

// 动态高度计算
toggleFAQ(item: VirtualFAQItem, index: number): void {
  item.isExpanded = !item.isExpanded;

  // 动态调整项目高度
  if (item.isExpanded) {
    item.height = this.calculateExpandedHeight(item);
  } else {
    item.height = this.itemHeight;
  }

  // 通知虚拟滚动更新
  this.viewport.checkViewportSize();
}
```
