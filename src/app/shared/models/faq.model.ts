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
  ERROR = 'error',
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

/**
 * API响应包装器
 */
export interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: Date;
  version: string;
}

/**
 * 错误处理接口
 */
export interface FAQError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  loadTime: number;
  searchTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

/**
 * 用户会话接口
 */
export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  viewedFAQs: string[];
  searchQueries: string[];
  preferences: UserPreferences;
}

/**
 * FAQ内容版本控制
 */
export interface FAQVersion {
  version: string;
  content: string;
  author: string;
  timestamp: Date;
  changeLog: string;
}

/**
 * 高级搜索配置
 */
export interface AdvancedSearchConfig {
  fuzzySearch: boolean;
  synonyms: Record<string, string[]>;
  stopWords: string[];
  minQueryLength: number;
  maxResults: number;
  boostFactors: {
    titleMatch: number;
    categoryMatch: number;
    contentMatch: number;
    popularityBoost: number;
  };
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number;
  strategy: 'lru' | 'fifo' | 'lfu';
}

/**
 * 分析数据接口
 */
export interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  searchQueries: Array<{ query: string; count: number }>;
  popularFAQs: Array<{ faqId: string; views: number }>;
  categoryDistribution: Array<{ category: string; percentage: number }>;
  userEngagement: {
    averageSessionDuration: number;
    bounceRate: number;
    pagesPerSession: number;
  };
}

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: {
    small: string;
    medium: string;
    large: string;
  };
}

/**
 * 可访问性配置
 */
export interface AccessibilityConfig {
  highContrast: boolean;
  largeText: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  reducedMotion: boolean;
}

/**
 * 国际化配置
 */
export interface I18nConfig {
  defaultLanguage: string;
  supportedLanguages: string[];
  translations: Record<string, Record<string, string>>;
  dateFormat: string;
  numberFormat: string;
}

/**
 * 严格类型的事件处理器
 */
export type FAQEventHandler<T = any> = (event: FAQEvent & { data?: T }) => void;

/**
 * 组件状态接口
 */
export interface ComponentState {
  loading: boolean;
  error: FAQError | null;
  data: any;
  lastUpdated: Date;
}

/**
 * 验证规则接口
 */
export interface ValidationRule {
  field: string;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
}

/**
 * 数据转换接口
 */
export interface DataTransformer<TInput, TOutput> {
  transform(input: TInput): TOutput;
  reverse?(output: TOutput): TInput;
}

/**
 * 严格类型的配置对象
 */
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  features: {
    search: boolean;
    analytics: boolean;
    socialSharing: boolean;
    offlineMode: boolean;
  };
  performance: {
    virtualScrolling: boolean;
    lazyLoading: boolean;
    caching: CacheConfig;
  };
  ui: {
    theme: ThemeConfig;
    accessibility: AccessibilityConfig;
    i18n: I18nConfig;
  };
}
