import { Injectable } from '@angular/core';
import { RecipeLoggerService } from '../../core/services/logger.service';

/**
 * Recipe Autocomplete Service
 *
 * Provides field suggestions for Recipe walkthrough step configurations.
 * Each step type has predefined fields specific to its functionality
 * (e.g., Batch Settings, Trigger Settings, Action Button Settings).
 *
 * These field lists come from the Recipe Producer application and
 * help users configure recipe steps with correct field names.
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeAutocompleteService {
  // Predefined fields for autocomplete by step type
  private readonly executableFields = [
    'Action',
    'Add reference field mappings for subsequent Executables?',
    'Batchable?',
    'Create non-reference field mappings?',
    'Create reference field mappings based on prior Executables?',
    'Description',
    'Executable API Name',
    'Executable Name',
    'Log to File?',
    'Source Matching Field',
    'Source Object API Name',
    'Target Matching Field',
    'Target Object API Name',
    'Seq NO.'
  ];

  private readonly triggerFields = [
    'After Delete Trigger?',
    'After Insert Trigger?',
    'After Undelete Trigger?',
    'After Update Trigger?',
    'All Internal Users Have Read Access?',
    'Applicable for Self-Adaptive Triggers?',
    'Applicable for Trigger Actions?',
    'Batchable?',
    'Before Delete Trigger?',
    'Before Insert Trigger?',
    'Before Update Trigger?',
    'Bypass Triggers Custom Permissions',
    'Do Not Track AGG Sources in Trigger?',
    'Pipeline',
    'Execute Access Permissions',
    'Run Once on Recursive Updates?',
    'Seq No.'
  ];

  private readonly scopingFields = [
    'Joiner',
    'Scope Filter',
    'Scope Filter (After Delete Trigger)',
    'Scope Filter (After Insert Trigger)',
    'Scope Filter (After Undelete Trigger)',
    'Scope Filter (After Update Trigger)',
    'Scope Filter (Before Delete Trigger)',
    'Scope Filter (Before Insert Trigger)',
    'Scope Filter (Before Update Trigger)',
    'Scope Filter (Post Join)'
  ];

  private readonly matchFields = [
    'Additional Target Matching Criteria',
    'Matched Records Sorting Components',
    'Principal Matched Record Selection Rule',
    'Target Matching Field',
    'Target Object API Name'
  ];

  private readonly actionFields = [
    'Action',
    'All or Nothing?',
    'Bypass Duplicate Rule Alerts?',
    'Skip Fields if Target Value Exists?',
    'Skip Null Value Fields?',
    'Skip Record Update if No Changes?',
    'Source Object Writeback Field',
    'Target Connection Name',
    'Target Object API Name',
    'Use Salesforce Upsert API?',
    'Action in Future Method in Triggers?'
  ];

  private readonly retrieveVerifyPreviewFields = [
    'SOQL Query'
  ];

  private readonly batchSettingsFields = [
    'Action to Bulk API?',
    'Auto Retry Failed Batches?',
    'Batch Size',
    'Incremental Retrieval Field',
    'Incremental Retrieval Seed Time (Date)',
    'Incremental Retrieval Seed Time (Time)',
    'Incremental Retrieval Since',
    'Log to File?',
    'Notify Email Addresses',
    'Notify Owner?',
    'Notify When Execution Completes',
    'Execute Access Permissions',
    'Retrieve Limit',
    'Serial Mode?',
    'Stop Execution When a Batch Fails?',
    'Use Salesforce Upsert API?'
  ];

  private readonly actionButtonSettingsFields = [
    'Action Button Label',
    'Action Button Variant',
    'Action Confirm Message',
    'Action Icon Name',
    'Confirm Before Action?',
    'Edit Target Fields Before Action',
    'Q: List Action?',
    'Q: Row Action?',
    'Execute Access Permissions',
    'Success Message (UI)'
  ];

  private readonly dataListSettingsFields = [
    'Action Button Label',
    'Action Button Variant',
    'Action Confirm Message',
    'Action Icon Name',
    'Confirm Before Action?',
    'Edit Target Fields Before Action',
    'Q: List Action?',
    'Q: Row Action?',
    'Execute Access Permissions',
    'Success Message (UI)',
    'Auto-refresh Interval (sec)',
    'Auto-refresh?',
    'Background?',
    'Data Source Type',
    'Default Row Height (px)',
    'SOQL Query (When Data Source is SOQL)',
    'Custom Apex Method (When Data Source is Custom Apex)',
    'List Display Columns',
    'List Height (px)',
    'List Width (px)',
    'Max Rows Retrieved',
    'Pagination Size',
    'Quick List Field'
  ];

  private readonly dataLoaderSettingsFields = [
    'Available Loaders',
    'Data Loader Description',
    'Data Loader Label',
    'Execute Access Permissions',
    'Layout Name',
    'Object API Name',
    'Record Types',
    'Show Cloning Option?'
  ];

  private readonly inputFields = [
    'Default Value',
    'Input Variable Label',
    'Input Variable Name',
    'Input Variable Required?',
    'Input Variable Type',
    'Picklist Values (One Value Per Line)'
  ];

  private readonly mappingFields = [
    'Batch Target Object',
    'Compare Target Record with Matched Record?',
    'Field Mappings',
    'Mapping Cardinality',
    'Processing Priority',
    'Skip Fields if Source Value is Blank?',
    'Skip Fields if Target Value Exists?',
    'Skip Null Value Fields?',
    'Skip Record Update if No Changes?',
    'Source',
    'Source Type',
    'Target Fields',
    'Target Object API Name'
  ];

  private readonly variableFields = [
    'SOQL Query',
    'Variable API Name'
  ];

  constructor(private logger: RecipeLoggerService) {
    this.logger.debug('RecipeAutocompleteService initialized');
  }

  // ==================== Main Methods ====================

  /**
   * Get field suggestions based on step type
   * Returns array of predefined fields for the given step type
   */
  getFieldSuggestions(stepType: string): string[] {
    switch (stepType) {
      case 'Create Executable':
      case 'Create Pipeline':
      case 'Create Scheduler':
        return this.executableFields;

      case 'Trigger Settings':
        return this.triggerFields;

      case 'Scoping':
        return this.scopingFields;

      case 'Match':
        return this.matchFields;

      case 'Action':
        return this.actionFields;

      case 'Retrieve':
      case 'Verify':
      case 'Preview':
      case 'Preview Transformed':
        return this.retrieveVerifyPreviewFields;

      case 'Batch Settings':
        return this.batchSettingsFields;

      case 'Action Button Settings':
        return this.actionButtonSettingsFields;

      case 'Data List Settings':
        return this.dataListSettingsFields;

      case 'Data Loader Settings':
        return this.dataLoaderSettingsFields;

      case 'Input':
        return this.inputFields;

      case 'Mapping':
        return this.mappingFields;

      case 'Variable':
        return this.variableFields;

      default:
        return []; // No suggestions for unknown step types
    }
  }

  /**
   * Filter field suggestions by query string
   * Case-insensitive partial matching
   */
  filterFieldSuggestions(stepType: string, query: string): string[] {
    const fields = this.getFieldSuggestions(stepType);

    if (!query || query.trim() === '') {
      return fields;
    }

    const lowerQuery = query.toLowerCase().trim();
    return fields.filter(field =>
      field.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Check if a step type has autocomplete suggestions
   */
  hasAutocomplete(stepType: string): boolean {
    return this.getFieldSuggestions(stepType).length > 0;
  }

  /**
   * Get all supported step types
   */
  getSupportedStepTypes(): string[] {
    return [
      'Create Executable',
      'Create Pipeline',
      'Create Scheduler',
      'Trigger Settings',
      'Scoping',
      'Match',
      'Action',
      'Retrieve',
      'Verify',
      'Preview',
      'Preview Transformed',
      'Batch Settings',
      'Action Button Settings',
      'Data List Settings',
      'Data Loader Settings',
      'Input',
      'Mapping',
      'Variable'
    ];
  }

  /**
   * Get count of available fields for a step type
   */
  getFieldCount(stepType: string): number {
    return this.getFieldSuggestions(stepType).length;
  }

  /**
   * Search across all field types
   * Returns map of step types to matching fields
   */
  searchAllFields(query: string): Map<string, string[]> {
    const results = new Map<string, string[]>();

    if (!query || query.trim() === '') {
      return results;
    }

    const lowerQuery = query.toLowerCase().trim();
    const stepTypes = this.getSupportedStepTypes();

    stepTypes.forEach(stepType => {
      const fields = this.getFieldSuggestions(stepType);
      const matches = fields.filter(field =>
        field.toLowerCase().includes(lowerQuery)
      );

      if (matches.length > 0) {
        results.set(stepType, matches);
      }
    });

    return results;
  }

  /**
   * Get exact match for a field name
   * Returns the step type if found, null otherwise
   */
  findStepTypeForField(fieldName: string): string | null {
    const stepTypes = this.getSupportedStepTypes();

    for (const stepType of stepTypes) {
      const fields = this.getFieldSuggestions(stepType);
      if (fields.includes(fieldName)) {
        return stepType;
      }
    }

    return null;
  }

  /**
   * Validate if a field belongs to a step type
   */
  isValidFieldForStepType(field: string, stepType: string): boolean {
    const fields = this.getFieldSuggestions(stepType);
    return fields.includes(field);
  }

  /**
   * Get similar field suggestions using fuzzy matching
   * Uses simple Levenshtein-like distance for similarity
   */
  getSimilarFields(stepType: string, input: string, maxResults: number = 5): string[] {
    const fields = this.getFieldSuggestions(stepType);
    if (!input || input.trim() === '') {
      return fields.slice(0, maxResults);
    }

    const lowerInput = input.toLowerCase().trim();

    // Sort by similarity score
    const scored = fields.map(field => ({
      field,
      score: this.calculateSimilarityScore(lowerInput, field.toLowerCase())
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored
      .slice(0, maxResults)
      .filter(item => item.score > 0)
      .map(item => item.field);
  }

  /**
   * Calculate similarity score between two strings
   * Higher score = more similar
   */
  private calculateSimilarityScore(input: string, target: string): number {
    let score = 0;

    // Exact match bonus
    if (input === target) {
      return 1000;
    }

    // Starts with bonus
    if (target.startsWith(input)) {
      score += 500;
    }

    // Contains match
    if (target.includes(input)) {
      score += 100;
    }

    // Word boundary match bonus
    const inputWords = input.split(/\s+/);
    const targetWords = target.split(/\s+/);

    inputWords.forEach(inputWord => {
      targetWords.forEach(targetWord => {
        if (targetWord.startsWith(inputWord)) {
          score += 50;
        } else if (targetWord.includes(inputWord)) {
          score += 25;
        }
      });
    });

    // Character overlap
    let overlap = 0;
    for (const char of input) {
      if (target.includes(char)) {
        overlap++;
      }
    }
    score += overlap;

    return score;
  }
}
