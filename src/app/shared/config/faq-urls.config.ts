/**
 * FAQ URL Configuration
 * Centralized management for all FAQ internal navigation links
 * This configuration maps FAQ references to their corresponding routes
 */

const FAQ_BASE_URL = ''; // Use relative URLs for local navigation

export interface FAQUrlMapping {
  // The key used in HTML files to reference this URL
  key: string;
  // The actual URL path
  path: string;
  // Optional fragment (hash) for the URL
  fragment?: string;
  // Description for documentation
  description?: string;
}

/**
 * FAQ URL mappings organized by category
 * Use these keys in HTML files instead of hardcoded URLs
 * Example in HTML: data-faq-link="batch.what-is-batch"
 */
export const FAQ_URL_MAPPINGS: { [category: string]: { [key: string]: FAQUrlMapping } } = {
  // Rules Engines Category
  'rules-engines': {
    'batch.what-is-batch': {
      key: 'batch.what-is-batch',
      path: '/batch-what-is-batch-job'
    },
    'data-list.what-is-data-list': {
      key: 'data-list.what-is-data-list',
      path: '/data-list-what-is-data-list'
    },
    'triggers.how-it-works': {
      key: 'triggers.how-it-works',
      path: '/triggers-how-it-works'
    },
    'triggers.what-is-self-adaptive-trigger': {
      key: 'triggers.what-is-self-adaptive-trigger',
      path: '/triggers-what-is-self-adaptive-trigger'
    },
    'action-button.what-is-action-button': {
      key: 'action-button.what-is-action-button',
      path: '/action-button-what-is-action-button'
    },
    'data-loader.how-it-works': {
      key: 'data-loader.how-it-works',
      path: '/data-loader-how-it-works'
    }
  },
  
  // Process Steps Category
  'process-steps': {
    'input.what-does-input-do': {
      key: 'input.what-does-input-do',
      path: '/input-what-does-input-do'
    },
    'preview.what-does-preview-do': {
      key: 'preview.what-does-preview-do',
      path: '/preview-what-does-preview-do'
    },
    'retrieve.what-does-retrieve-do': {
      key: 'retrieve.what-does-retrieve-do',
      path: '/retrieve-what-does-retrieve-do'
    },
    'scoping.what-does-scoping-do': {
      key: 'scoping.what-does-scoping-do',
      path: '/scoping-what-does-scoping-do'
    },
    'match.what-does-match-do': {
      key: 'match.what-does-match-do',
      path: '/match-what-does-match-do'
    },
    'mapping.what-does-mapping-do': {
      key: 'mapping.what-does-mapping-do',
      path: '/mapping-what-does-mapping-do'
    },
    'action.what-does-action-do': {
      key: 'action.what-does-action-do',
      path: '/action-what-does-action-do'
    },
    'verify.what-does-verify-do': {
      key: 'verify.what-does-verify-do',
      path: '/verify-what-does-verify-do'
    }
  },




  // Query Manager Category
  'query-manager': {
    'query-manager.what-is-query-manager': {
      key: 'query-manager.what-is-query-manager',
      path: '/query-manager-what-is-query-manager'
    }
  }
};

/**
 * Helper function to get URL configuration by key
 * @param key The reference key (e.g., "batch.what-is-batch")
 * @returns The URL mapping or undefined if not found
 */
export function getFAQUrl(key: string): FAQUrlMapping | undefined {
  // Split the key to find category and sub-key
  const parts = key.split('.');
  
  // Try to find in all categories
  for (const category of Object.keys(FAQ_URL_MAPPINGS)) {
    const mapping = FAQ_URL_MAPPINGS[category][key];
    if (mapping) {
      return mapping;
    }
  }
  
  return undefined;
}

/**
 * Helper function to build full URL from mapping
 * @param mapping The URL mapping
 * @returns The complete URL string
 */
export function buildFAQUrlFromMapping(mapping: FAQUrlMapping): string {
  return FAQ_BASE_URL + mapping.path;
}

/**
 * Get FAQ URL by key and return the complete URL
 * @param key The reference key
 * @returns The complete URL or empty string if not found
 */
export function getFAQUrlByKey(key: string): string {
  const mapping = getFAQUrl(key);
  return mapping ? buildFAQUrlFromMapping(mapping) : '';
}