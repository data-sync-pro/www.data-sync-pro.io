import { Injectable } from '@angular/core';
import {
  SourceRecipeRecord,
  RecipeWalkthroughStep,
  RecipePrerequisiteItem,
  RecipeStepMedia,
  RecipeGeneralImage
} from '../../core/models/recipe.model';
import { RecipeLoggerService } from '../../core/services/logger.service';

/**
 * Validation Result Interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation Error Interface
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'critical';
}

/**
 * Validation Warning Interface
 */
export interface ValidationWarning {
  field: string;
  message: string;
}

/**
 * Recipe Validation Service
 *
 * Provides validation logic for Recipe data including:
 * - Required field validation
 * - Data type validation
 * - Image reference validation
 * - Walkthrough step validation
 * - Prerequisites validation
 *
 * Returns structured validation results with errors and warnings.
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeValidationService {
  constructor(private logger: RecipeLoggerService) {
    this.logger.debug('RecipeValidationService initialized');
  }

  // ==================== Main Validation ====================

  /**
   * Validate entire recipe
   * Returns comprehensive validation result
   */
  validateRecipe(recipe: SourceRecipeRecord): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate required fields
    errors.push(...this.validateRequiredFields(recipe));

    // Validate ID format
    if (recipe.id && !this.isValidId(recipe.id)) {
      errors.push({
        field: 'id',
        message: 'Recipe ID must contain only alphanumeric characters, hyphens, and underscores',
        severity: 'error'
      });
    }

    // Validate category
    if (recipe.category && !this.isValidCategory(recipe.category)) {
      errors.push({
        field: 'category',
        message: 'Invalid category value',
        severity: 'error'
      });
    }

    // Validate walkthrough steps
    if (recipe.walkthrough && recipe.walkthrough.length > 0) {
      const stepResults = this.validateWalkthroughSteps(recipe.walkthrough);
      errors.push(...stepResults.errors);
      warnings.push(...stepResults.warnings);
    } else {
      warnings.push({
        field: 'walkthrough',
        message: 'Recipe has no walkthrough steps'
      });
    }

    // Validate prerequisites
    if (recipe.prerequisites && recipe.prerequisites.length > 0) {
      const prereqResults = this.validatePrerequisites(recipe.prerequisites);
      errors.push(...prereqResults.errors);
      warnings.push(...prereqResults.warnings);
    }

    // Validate general images
    if (recipe.generalImages && recipe.generalImages.length > 0) {
      const imageResults = this.validateGeneralImages(recipe.generalImages);
      errors.push(...imageResults.errors);
      warnings.push(...imageResults.warnings);
    }

    // Check for empty content
    if (!recipe.overview || recipe.overview.trim() === '') {
      warnings.push({
        field: 'overview',
        message: 'Recipe overview is empty'
      });
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings
    };

    if (!result.valid) {
      this.logger.warn('Recipe validation failed', {
        recipeId: recipe.id,
        errorCount: errors.length,
        warningCount: warnings.length
      });
    }

    return result;
  }

  // ==================== Field Validation ====================

  /**
   * Validate required fields
   */
  private validateRequiredFields(recipe: SourceRecipeRecord): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!recipe.id || recipe.id.trim() === '') {
      errors.push({
        field: 'id',
        message: 'Recipe ID is required',
        severity: 'critical'
      });
    }

    if (!recipe.title || recipe.title.trim() === '') {
      errors.push({
        field: 'title',
        message: 'Recipe title is required',
        severity: 'critical'
      });
    }

    if (!recipe.category || recipe.category.trim() === '') {
      errors.push({
        field: 'category',
        message: 'Recipe category is required',
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Validate ID format
   * IDs should contain only alphanumeric characters, hyphens, and underscores
   */
  private isValidId(id: string): boolean {
    const idPattern = /^[a-zA-Z0-9_-]+$/;
    return idPattern.test(id);
  }

  /**
   * Validate category value
   */
  private isValidCategory(category: string): boolean {
    const validCategories = [
      'Batch',
      'Trigger',
      'Data List',
      'Action Button',
      'Data Loader',
      'General'
    ];
    return validCategories.includes(category);
  }

  // ==================== Walkthrough Validation ====================

  /**
   * Validate walkthrough steps
   */
  private validateWalkthroughSteps(steps: RecipeWalkthroughStep[]): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    steps.forEach((step, index) => {
      const stepLabel = `walkthrough[${index}]`;

      // Validate step name
      if (!step.step || step.step.trim() === '') {
        errors.push({
          field: `${stepLabel}.step`,
          message: `Step ${index + 1} is missing a step name`,
          severity: 'error'
        });
      }

      // Validate step config
      if (step.config && step.config.length > 0) {
        const configResults = this.validateStepConfig(step.config, index);
        errors.push(...configResults.errors);
        warnings.push(...configResults.warnings);
      }

      // Validate step media
      if (step.media && step.media.length > 0) {
        const mediaResults = this.validateStepMedia(step.media, index);
        errors.push(...mediaResults.errors);
        warnings.push(...mediaResults.warnings);
      }
    });

    return { errors, warnings };
  }

  /**
   * Validate step config
   */
  private validateStepConfig(config: any[], stepIndex: number): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    config.forEach((item, configIndex) => {
      const fieldLabel = `walkthrough[${stepIndex}].config[${configIndex}]`;

      if (!item.field || item.field.trim() === '') {
        errors.push({
          field: `${fieldLabel}.field`,
          message: `Step ${stepIndex + 1}, config ${configIndex + 1}: field name is missing`,
          severity: 'error'
        });
      }

      if (item.value === undefined || item.value === null) {
        warnings.push({
          field: `${fieldLabel}.value`,
          message: `Step ${stepIndex + 1}, config "${item.field || configIndex + 1}": value is empty`
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * Validate step media
   */
  private validateStepMedia(media: RecipeStepMedia[], stepIndex: number): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    media.forEach((item, mediaIndex) => {
      const fieldLabel = `walkthrough[${stepIndex}].media[${mediaIndex}]`;

      if (!item.url || item.url.trim() === '') {
        errors.push({
          field: `${fieldLabel}.url`,
          message: `Step ${stepIndex + 1}, media ${mediaIndex + 1}: image URL is missing`,
          severity: 'error'
        });
      }

      if (!item.alt || item.alt.trim() === '') {
        warnings.push({
          field: `${fieldLabel}.alt`,
          message: `Step ${stepIndex + 1}, media ${mediaIndex + 1}: alt text is missing`
        });
      }
    });

    return { errors, warnings };
  }

  // ==================== Prerequisites Validation ====================

  /**
   * Validate prerequisites
   */
  private validatePrerequisites(prerequisites: RecipePrerequisiteItem[]): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    prerequisites.forEach((prereq, index) => {
      const fieldLabel = `prerequisites[${index}]`;

      if (!prereq.description || prereq.description.trim() === '') {
        errors.push({
          field: `${fieldLabel}.description`,
          message: `Prerequisite ${index + 1}: description is required`,
          severity: 'error'
        });
      }

      // Validate quick links if present
      if (prereq.quickLinks && prereq.quickLinks.length > 0) {
        prereq.quickLinks.forEach((link, linkIndex) => {
          if (!link.title || link.title.trim() === '') {
            warnings.push({
              field: `${fieldLabel}.quickLinks[${linkIndex}].title`,
              message: `Prerequisite ${index + 1}, Quick Link ${linkIndex + 1}: title is missing`
            });
          }
          if (!link.url || link.url.trim() === '') {
            warnings.push({
              field: `${fieldLabel}.quickLinks[${linkIndex}].url`,
              message: `Prerequisite ${index + 1}, Quick Link ${linkIndex + 1}: URL is missing`
            });
          }
        });
      }
    });

    return { errors, warnings };
  }

  // ==================== General Images Validation ====================

  /**
   * Validate general images
   */
  private validateGeneralImages(images: RecipeGeneralImage[]): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    images.forEach((image, index) => {
      const fieldLabel = `generalImages[${index}]`;

      if (!image.url || image.url.trim() === '') {
        errors.push({
          field: `${fieldLabel}.url`,
          message: `General image ${index + 1}: image URL is required`,
          severity: 'error'
        });
      }

      if (!image.alt || image.alt.trim() === '') {
        warnings.push({
          field: `${fieldLabel}.alt`,
          message: `General image ${index + 1}: alt text is missing`
        });
      }
    });

    return { errors, warnings };
  }

  // ==================== Utility Methods ====================

  /**
   * Check if recipe has critical errors that prevent saving
   */
  hasCriticalErrors(validationResult: ValidationResult): boolean {
    return validationResult.errors.some(e => e.severity === 'critical');
  }

  /**
   * Get formatted error messages
   */
  getErrorMessages(validationResult: ValidationResult): string[] {
    return validationResult.errors.map(e => `${e.field}: ${e.message}`);
  }

  /**
   * Get formatted warning messages
   */
  getWarningMessages(validationResult: ValidationResult): string[] {
    return validationResult.warnings.map(w => `${w.field}: ${w.message}`);
  }

  /**
   * Get summary string
   */
  getSummary(validationResult: ValidationResult): string {
    const errorCount = validationResult.errors.length;
    const warningCount = validationResult.warnings.length;

    if (errorCount === 0 && warningCount === 0) {
      return 'Validation passed';
    }

    const parts: string[] = [];
    if (errorCount > 0) {
      parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
    }
    if (warningCount > 0) {
      parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
    }

    return parts.join(', ');
  }

  /**
   * Quick validation - only check critical fields
   */
  quickValidate(recipe: SourceRecipeRecord): boolean {
    return !!(recipe.id && recipe.id.trim() !== '' &&
              recipe.title && recipe.title.trim() !== '' &&
              recipe.category && recipe.category.trim() !== '');
  }
}
