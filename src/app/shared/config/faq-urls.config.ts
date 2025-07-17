/**
 * FAQ URL Configuration
 * Centralized management for all FAQ internal navigation links
 * This configuration maps FAQ references to their corresponding routes
 */

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
    'batch': {
      key: 'batch',
      path: '/Rules%20Engines/Batch',
      description: 'Batch Rules Engine overview'
    },
    'batch.what-is-batch': {
      key: 'batch.what-is-batch',
      path: '/Rules%20Engines/Batch',
      fragment: 'what-is-a-batch-job-in-general',
      description: 'What is a Batch Job'
    },
    'data-list': {
      key: 'data-list',
      path: '/Rules%20Engines/Data%20List',
      description: 'Data List Rules Engine overview'
    },
    'data-list.what-is-data-list': {
      key: 'data-list.what-is-data-list',
      path: '/Rules%20Engines/Data%2520List',
      fragment: 'what-is-a-data-list-in-data-sync-pro',
      description: 'What is a Data List'
    },
    'triggers': {
      key: 'triggers',
      path: '/Rules%20Engines/Triggers',
      description: 'Triggers Rules Engine overview'
    },
    'triggers.how-it-works': {
      key: 'triggers.how-it-works',
      path: '/Rules%20Engines/Triggers',
      fragment: 'how-does-the-dsp-trigger-rules-engine-work',
      description: 'How DSP Trigger Rules Engine Works'
    },
    'action-button': {
      key: 'action-button',
      path: '/Rules%20Engines/Action%20Button',
      description: 'Action Button Rules Engine overview'
    },
    'action-button.what-is-action-button': {
      key: 'action-button.what-is-action-button',
      path: '/Rules%20Engines/Action%2520Button',
      fragment: 'what-is-an-action-button-in-data-sync-pro',
      description: 'What is an Action Button'
    },
    'data-loader': {
      key: 'data-loader',
      path: '/Rules%20Engines/Data%20Loader',
      description: 'Data Loader Rules Engine overview'
    },
    'data-loader.how-it-works': {
      key: 'data-loader.how-it-works',
      path: '/Rules%20Engines/Data%2520Loader',
      fragment: 'how-does-the-data-loader-work-in-dsp',
      description: 'How Data Loader Works'
    }
  },
  
  // Process Steps Category
  'process-steps': {
    'input': {
      key: 'input',
      path: '/Input',
      description: 'Input Process Step overview'
    },
    'input.what-does-input-do': {
      key: 'input.what-does-input-do',
      path: '/Input',
      fragment: 'what-does-input-do',
      description: 'What does Input do'
    },
    'preview': {
      key: 'preview',
      path: '/Preview',
      description: 'Preview Process Step overview'
    },
    'preview.what-does-preview-do': {
      key: 'preview.what-does-preview-do',
      path: '/Preview',
      fragment: 'what-does-preview-do',
      description: 'What does Preview do'
    },
    'retrieve': {
      key: 'retrieve',
      path: '/Retrieve',
      description: 'Retrieve Process Step overview'
    },
    'retrieve.what-does-retrieve-do': {
      key: 'retrieve.what-does-retrieve-do',
      path: '/Retrieve',
      fragment: 'what-does-retrieve-do',
      description: 'What does Retrieve do'
    },
    'scoping': {
      key: 'scoping',
      path: '/Scoping',
      description: 'Scoping Process Step overview'
    },
    'scoping.what-does-scoping-do': {
      key: 'scoping.what-does-scoping-do',
      path: '/Scoping',
      fragment: 'what-does-scoping-do',
      description: 'What does Scoping do'
    },
    'match': {
      key: 'match',
      path: '/Match',
      description: 'Match Process Step overview'
    },
    'match.what-does-match-do': {
      key: 'match.what-does-match-do',
      path: '/Match',
      fragment: 'what-does-match-do',
      description: 'What does Match do'
    },
    'mapping': {
      key: 'mapping',
      path: '/Mapping',
      description: 'Mapping Process Step overview'
    },
    'mapping.what-does-mapping-do': {
      key: 'mapping.what-does-mapping-do',
      path: '/Mapping',
      fragment: 'what-does-mapping-do',
      description: 'What does Mapping do'
    },
    'action': {
      key: 'action',
      path: '/Action',
      description: 'Action Process Step overview'
    },
    'action.what-does-action-do': {
      key: 'action.what-does-action-do',
      path: '/Action',
      fragment: 'what-does-action-do',
      description: 'What does Action do'
    },
    'verify': {
      key: 'verify',
      path: '/Verify',
      description: 'Verify Process Step overview'
    },
    'verify.what-does-verify-do': {
      key: 'verify.what-does-verify-do',
      path: '/Verify',
      fragment: 'what-does-verify-do',
      description: 'What does Verify do'
    }
  },

  // Executables Category
  'executables': {
    'executables-overview': {
      key: 'executables-overview',
      path: '/Executables',
      description: 'Executables overview'
    },
    'what-is-executable': {
      key: 'what-is-executable',
      path: '/Executables',
      fragment: 'what-is-an-executable-in-dsp',
      description: 'What is an Executable'
    },
    'executable-sharing': {
      key: 'executable-sharing',
      path: '/Executables',
      fragment: 'how-are-executables-shared',
      description: 'How are Executables shared'
    }
  },

  // Connections Category
  'connections': {
    'connections-overview': {
      key: 'connections-overview',
      path: '/Connections',
      description: 'Connections overview'
    },
    'what-is-connection': {
      key: 'what-is-connection',
      path: '/Connections',
      fragment: 'what-is-a-dsp-connection',
      description: 'What is a DSP Connection'
    },
    'setup-connection': {
      key: 'setup-connection',
      path: '/Connections',
      fragment: 'how-to-set-up-a-connection',
      description: 'How to set up a Connection'
    }
  },

  // General Category
  'general': {
    'what-is-dsp': {
      key: 'what-is-dsp',
      path: '/General',
      fragment: 'what-is-data-sync-pro',
      description: 'What is Data Sync Pro'
    },
    'why-dsp': {
      key: 'why-dsp',
      path: '/General',
      fragment: 'why-data-sync-pro',
      description: 'Why Data Sync Pro'
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
  let url = mapping.path;
  if (mapping.fragment) {
    url += '#' + mapping.fragment;
  }
  return url;
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