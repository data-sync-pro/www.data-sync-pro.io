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
  // Category-level mappings (for auto-link navigation to category lists)
  'categories': {
    'batch': {
      key: 'batch',
      path: '/rules-engines/batch',
      description: 'Batch Rules Engine Category'
    },
    'trigger': {
      key: 'trigger',
      path: '/rules-engines/trigger',
      description: 'Triggers Rules Engine Category'
    },
    'data-list': {
      key: 'data-list',
      path: '/rules-engines/data-list',
      description: 'Data List Rules Engine Category'
    },
    'action-button': {
      key: 'action-button',
      path: '/rules-engines/action-button',
      description: 'Action Button Rules Engine Category'
    },
    'data-loader': {
      key: 'data-loader',
      path: '/rules-engines/data-loader',
      description: 'Data Loader Rules Engine Category'
    },
    'processes.input': {
      key: 'processes.input',
      path: '/processes/input',
      description: 'Input Process Step'
    },
    'processes.preview': {
      key: 'processes.preview',
      path: '/processes/preview',
      description: 'Preview Process Step'
    },
    'processes.retrieve': {
      key: 'processes.retrieve',
      path: '/processes/retrieve',
      description: 'Retrieve Process Step'
    },
    'processes.scoping': {
      key: 'processes.scoping',
      path: '/processes/scoping',
      description: 'Scoping Process Step'
    },
    'processes.match': {
      key: 'processes.match',
      path: '/processes/match',
      description: 'Match Process Step'
    },
    'processes.mapping': {
      key: 'processes.mapping',
      path: '/processes/mapping',
      description: 'Mapping Process Step'
    },
    'processes.action': {
      key: 'processes.action',
      path: '/processes/action',
      description: 'Action Process Step'
    },
    'processes.verify': {
      key: 'processes.verify',
      path: '/processes/verify',
      description: 'Verify Process Step'
    },
    'query-manager': {
      key: 'query-manager',
      path: '/query-manager',
      description: 'Query Manager Category'
    }
  },
  
  // Rules Engines Category
  'rules-engines': {
    'batch.what-is-batch': {
      key: 'batch.what-is-batch',
      path: '/what-is-batch-job'
    },
    'data-list.what-is-data-list': {
      key: 'data-list.what-is-data-list',
      path: '/what-is-data-list'
    },
    'triggers.how-it-works': {
      key: 'triggers.how-it-works',
      path: '/how-does-trigger-work'
    },
    'trigger.what-is-self-adaptive-trigger': {
      key: 'trigger.what-is-self-adaptive-trigger',
      path: '/what-is-self-adaptive-trigger'
    },
    'action-button.what-is-action-button': {
      key: 'action-button.what-is-action-button',
      path: '/what-is-action-button'
    },
    'data-loader.how-it-works': {
      key: 'data-loader.how-it-works',
      path: '/what-is-data-loader'
    }
  },
  
  // Process Steps Category
  'process-steps': {
    'input.what-does-input-do': {
      key: 'input.what-does-input-do',
      path: '/what-does-input-do'
    },
    'preview.what-does-preview-do': {
      key: 'preview.what-does-preview-do',
      path: '/what-does-preview-do'
    },
    'retrieve.what-does-retrieve-do': {
      key: 'retrieve.what-does-retrieve-do',
      path: '/what-does-retrieve-do'
    },
    'scoping.what-does-scoping-do': {
      key: 'scoping.what-does-scoping-do',
      path: '/what-does-scoping-do'
    },
    'match.what-does-match-do': {
      key: 'match.what-does-match-do',
      path: '/what-does-match-do'
    },
    'mapping.what-does-mapping-do': {
      key: 'mapping.what-does-mapping-do',
      path: '/what-does-mapping-do'
    },
    'action.what-does-action-do': {
      key: 'action.what-does-action-do',
      path: '/what-does-action-do'
    },
    'verify.what-does-verify-do': {
      key: 'verify.what-does-verify-do',
      path: '/what-does-verify-do'
    }
  },

  // Query Manager Category
  'query-manager': {
    'query-manager.what-is-query-manager': {
      key: 'query-manager.what-is-query-manager',
      path: '/what-is-query-manager'
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