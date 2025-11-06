import { Injectable } from '@angular/core';
import { LoggerService } from '../../core/services/logger.service';

@Injectable({
  providedIn: 'root'
})
export class FieldSuggestionService {
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

  constructor(private logger: LoggerService) {
    this.logger.debug('FieldSuggestionService initialized');
  }

  getFieldSuggestions(stepType: string): string[] {
    switch (stepType) {
      case 'Create Executable':
      case 'Create Pipeline':
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
        return [];
    }
  }
}
