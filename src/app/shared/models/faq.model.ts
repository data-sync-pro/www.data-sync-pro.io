import { SafeHtml } from '@angular/platform-browser';

/**
 * 原始FAQ数据记录 (来自JSON文件)
 */
export interface SourceFAQRecord {
  Id: string;
  Name?: string;
  Question__c: string;
  Answer__c: string | null;
  Category__c: string;
  SubCategory__c: string | null;
  SeqNo__c?: string | null;
}

/**
 * 处理后的FAQ项目 (应用中使用)
 */
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
  isLoading?: boolean;
  tags?: string[];
  lastUpdated?: Date;
  showSocialShare?: boolean;
}

/**
 * 搜索结果项目 (包含搜索相关信息)
 */
export interface FAQSearchResult extends FAQItem {
  relevanceScore?: number;
  highlightedQuestion?: string;
  highlightedAnswer?: string;
  matchedFields?: string[];
}

/**
 * FAQ分类信息
 */
export interface FAQCategory {
  name: string;
  count: number;
  subCategories: FAQSubCategory[];
}

/**
 * FAQ子分类信息
 */
export interface FAQSubCategory {
  name: string;
  count: number;
  parentCategory: string;
}

/**
 * 分页信息
 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  category?: string;
  subCategory?: string;
  includeAnswers?: boolean;
  maxResults?: number;
  fuzzySearch?: boolean;
}

/**
 * FAQ统计信息
 */
export interface FAQStats {
  totalFAQs: number;
  totalCategories: number;
  totalSubCategories: number;
  mostViewedFAQs: FAQItem[];
  recentlyUpdated: FAQItem[];
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  preferredPageSize: number;
  preferredRenderMode: 'basic' | 'paginated' | 'virtual';
  searchHistory: string[];
  recentlyViewed: string[];
}

/**
 * FAQ操作事件
 */
export interface FAQEvent {
  type: 'view' | 'rate' | 'search';
  faqId?: string;
  faqQuestion?: string;
  faqCategory?: string;
  searchQuery?: string;
  rating?: boolean;
  timestamp: Date;
  userId?: string;
}

/**
 * 渲染策略类型
 */
export type RenderStrategy = 'basic' | 'paginated' | 'virtual';

/**
 * 设备类型
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * 连接速度类型
 */
export type ConnectionSpeed = 'slow' | 'fast';

/**
 * FAQ内容状态
 */
export enum FAQContentStatus {
  NOT_LOADED = 'not_loaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

/**
 * 搜索建议项目
 */
export interface SearchSuggestion {
  text: string;
  type: 'question' | 'category' | 'tag';
  count?: number;
  category?: string;
}

/**
 * FAQ过滤器
 */
export interface FAQFilter {
  categories: string[];
  subCategories: string[];
  searchQuery: string;
  showPopularOnly: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * FAQ排序选项
 */
export interface FAQSortOptions {
  field: 'question' | 'category' | 'viewCount' | 'lastUpdated';
  direction: 'asc' | 'desc';
}

/**
 * FAQ导出选项
 */
export interface FAQExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeCategories: string[];
  includeAnswers: boolean;
  includeMetadata: boolean;
}
