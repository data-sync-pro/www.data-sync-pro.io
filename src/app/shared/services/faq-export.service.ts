import { Injectable } from '@angular/core';
import { FAQStorageService, EditedFAQ } from './faq-storage.service';
import { FAQService } from './faq.service';
import { FAQItem } from '../models/faq.model';
import JSZip from 'jszip';

export interface ExportData {
  metadata: {
    exportDate: string;
    version: string;
    itemCount: number;
    editedCount: number;
  };
  faqs: any[];
  htmlContent: { [key: string]: string };
}

export interface ExportProgress {
  step: string;
  current: number;
  total: number;
  percentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class FAQExportService {
  private readonly EXPORT_VERSION = '1.0.0';

  constructor(
    private storageService: FAQStorageService,
    private faqService: FAQService
  ) {}

  async exportAllEdits(): Promise<ExportData> {
    const editedFAQs = await this.storageService.exportEdits();
    const allFAQs = this.faqService.getAllFAQs();
    
    // Separate new FAQs from edited ones
    const { newFAQs, editedExistingFAQs } = this.separateNewAndEditedFAQs(editedFAQs, allFAQs);
    
    // Merge edited FAQs with original data
    const mergedFAQs = this.mergeFAQData(allFAQs, editedExistingFAQs, newFAQs);
    
    // Prepare HTML content map
    const htmlContent: { [key: string]: string } = {};
    
    // Add HTML content for edited existing FAQs
    editedExistingFAQs.forEach(faq => {
      const fileName = this.getHTMLFileName(faq.faqId);
      if (fileName) {
        htmlContent[fileName] = this.cleanHTMLContent(faq.answer);
      }
    });
    
    // Add HTML content for new FAQs
    newFAQs.forEach(faq => {
      const fileName = this.generateHTMLFileNameForNewFAQ(faq);
      htmlContent[fileName] = this.cleanHTMLContent(faq.answer);
    });

    const totalItemCount = allFAQs.length + newFAQs.length;
    const totalEditedCount = editedExistingFAQs.length + newFAQs.length;

    const exportData: ExportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: this.EXPORT_VERSION,
        itemCount: totalItemCount,
        editedCount: totalEditedCount
      },
      faqs: mergedFAQs,
      htmlContent: htmlContent
    };

    return exportData;
  }

  private mergeFAQData(originalFAQs: FAQItem[], editedFAQs: EditedFAQ[], newFAQs: EditedFAQ[]): any[] {
    const editedMap = new Map<string, EditedFAQ>();
    editedFAQs.forEach(faq => {
      editedMap.set(faq.faqId, faq);
    });

    // Process existing FAQs (original + edited)
    const existingFAQsData = originalFAQs.map(faq => {
      const edited = editedMap.get(faq.id);
      if (edited) {
        // Return the original format with edited content
        return {
          Id: faq.id,
          Name: faq.name || faq.id,
          Category__c: edited.category,
          SubCategory__c: edited.subCategory || null,
          SeqNo__c: faq.seqNo || null,
          Question__c: edited.question,
          Answer__c: faq.answerPath
        };
      }
      // Return original FAQ in export format
      return {
        Id: faq.id,
        Name: faq.name || faq.id,
        Category__c: faq.category,
        SubCategory__c: faq.subCategory || null,
        SeqNo__c: faq.seqNo || null,
        Question__c: faq.question,
        Answer__c: faq.answerPath
      };
    });

    // Process new FAQs
    const newFAQsData = newFAQs.map(faq => {
      const htmlFileName = this.generateHTMLFileNameForNewFAQ(faq);
      return {
        Id: faq.faqId,
        Name: faq.faqId,
        Category__c: faq.category,
        SubCategory__c: faq.subCategory || null,
        SeqNo__c: null,
        Question__c: faq.question,
        Answer__c: htmlFileName
      };
    });

    // Combine existing and new FAQs
    return [...existingFAQsData, ...newFAQsData];
  }

  private getHTMLFileName(faqId: string): string | null {
    const faq = this.faqService.getAllFAQs().find(f => f.id === faqId);
    return faq?.answerPath || null;
  }

  private separateNewAndEditedFAQs(editedFAQs: EditedFAQ[], originalFAQs: FAQItem[]): { newFAQs: EditedFAQ[], editedExistingFAQs: EditedFAQ[] } {
    const originalFAQIds = new Set(originalFAQs.map(f => f.id));
    
    const newFAQs: EditedFAQ[] = [];
    const editedExistingFAQs: EditedFAQ[] = [];
    
    editedFAQs.forEach(faq => {
      if (originalFAQIds.has(faq.faqId)) {
        editedExistingFAQs.push(faq);
      } else {
        newFAQs.push(faq);
      }
    });
    
    return { newFAQs, editedExistingFAQs };
  }

  private generateHTMLFileNameForNewFAQ(faq: EditedFAQ): string {
    // Generate a filename based on the question, sanitized for file system
    const sanitizedQuestion = faq.question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .substring(0, 50); // Limit length
    
    // Use timestamp to ensure uniqueness
    const timestamp = new Date(faq.timestamp).toISOString().slice(0, 10);
    
    return `new-faq-${sanitizedQuestion}-${timestamp}.html`;
  }

  downloadAsJSON(data: ExportData): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    this.downloadFile(blob, `faq-export-${Date.now()}.json`);
  }

  downloadFAQsJSON(data: ExportData): void {
    const faqsJson = JSON.stringify(data.faqs, null, 2);
    const blob = new Blob([faqsJson], { type: 'application/json' });
    this.downloadFile(blob, 'faqs.json');
  }

  downloadHTMLFiles(data: ExportData): void {
    Object.entries(data.htmlContent).forEach(([fileName, content]) => {
      const cleanedContent = this.cleanHTMLContent(content);
      const blob = new Blob([cleanedContent], { type: 'text/html' });
      this.downloadFile(blob, fileName);
    });
  }

  async downloadAsZip(data: ExportData, progressCallback?: (progress: ExportProgress) => void): Promise<void> {
    const zip = new JSZip();
    const totalItems = Object.keys(data.htmlContent).length + 3; // HTML files + JSON + instructions + metadata
    let currentItem = 0;

    const updateProgress = (step: string) => {
      currentItem++;
      if (progressCallback) {
        progressCallback({
          step,
          current: currentItem,
          total: totalItems,
          percentage: Math.round((currentItem / totalItems) * 100)
        });
      }
    };

    try {
      // Add FAQ data JSON
      const faqsJson = JSON.stringify(data.faqs, null, 2);
      zip.file('faqs.json', faqsJson);
      updateProgress('Adding FAQ data');

      // Add HTML files
      for (const [fileName, content] of Object.entries(data.htmlContent)) {
        const cleanedContent = this.cleanHTMLContent(content);
        zip.file(`html-content/${fileName}`, cleanedContent);
        updateProgress(`Adding ${fileName}`);
      }

      // Add instructions
      const instructions = this.generateUpdateInstructions(data);
      zip.file('UPDATE_INSTRUCTIONS.txt', instructions);
      updateProgress('Adding instructions');

      // Add metadata
      const metadata = JSON.stringify(data.metadata, null, 2);
      zip.file('export-metadata.json', metadata);
      updateProgress('Adding metadata');

      // Generate ZIP
      const zipContent = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `faq-export-${timestamp}.zip`;

      this.downloadFile(zipContent, fileName);
    } catch (error: any) {
      console.error('Error creating ZIP file:', error);
      throw new Error(`Failed to create ZIP file: ${error?.message || 'Unknown error'}`);
    }
  }

  private downloadFile(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async importFromJSON(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content) as ExportData;
          
          // Validate export data
          if (!this.validateExportData(data)) {
            console.error('Invalid export data format');
            resolve(false);
            return;
          }

          // Convert back to EditedFAQ format
          const editedFAQs: EditedFAQ[] = [];
          
          for (const faq of data.faqs) {
            const htmlFileName = faq.Answer__c;
            const htmlContent = data.htmlContent[htmlFileName];
            
            if (htmlContent) {
              editedFAQs.push({
                id: `${faq.Id}_imported_${Date.now()}`,
                faqId: faq.Id,
                question: faq.Question__c,
                answer: htmlContent,
                category: faq.Category__c,
                subCategory: faq.SubCategory__c,
                timestamp: Date.now(),
                version: 1
              });
            }
          }

          // Import to storage
          const success = await this.storageService.importEdits(editedFAQs);
          resolve(success);
        } catch (error) {
          console.error('Error importing JSON:', error);
          resolve(false);
        }
      };

      reader.onerror = () => {
        console.error('Error reading file');
        resolve(false);
      };

      reader.readAsText(file);
    });
  }

  private validateExportData(data: any): data is ExportData {
    return data &&
      data.metadata &&
      data.metadata.version &&
      Array.isArray(data.faqs) &&
      data.htmlContent &&
      typeof data.htmlContent === 'object';
  }

  generateUpdateInstructions(data: ExportData): string {
    const instructions = `
FAQ Export Update Instructions
===============================
Export Date: ${data.metadata.exportDate}
Total FAQs: ${data.metadata.itemCount}
Edited FAQs: ${data.metadata.editedCount}

How to Update Your Codebase:
-----------------------------

1. Update FAQ Data:
   - Replace src/assets/data/faqs.json with the exported faqs.json file

2. Update HTML Content:
   - Copy all exported HTML files to src/assets/faq-item/
   - The following files need to be updated:
${Object.keys(data.htmlContent).map(file => `     - ${file}`).join('\n')}

3. Rebuild the Application:
   - Run: npm run build
   - Test the changes locally: npm start

4. Commit Changes:
   - git add src/assets/data/faqs.json
   - git add src/assets/faq-item/
   - git commit -m "Update FAQ content from editor"

Notes:
------
- Make sure to backup existing files before replacing
- Review all changes before committing to version control
- Test thoroughly in development before deploying to production
`;

    return instructions;
  }

  downloadInstructions(data: ExportData): void {
    const instructions = this.generateUpdateInstructions(data);
    const blob = new Blob([instructions], { type: 'text/plain' });
    this.downloadFile(blob, 'UPDATE_INSTRUCTIONS.txt');
  }

  /**
   * Clean HTML content by removing unwanted text and attributes
   */
  private cleanHTMLContent(content: string): string {
    if (!content) return content;
    
    // Create a temporary DOM element to parse and clean the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Remove any text nodes that contain "faq-editor"
    this.removeUnwantedTextNodes(tempDiv, 'faq-editor');
    
    // Remove data-start and data-end attributes and inline styles from all elements
    this.removeUnwantedAttributes(tempDiv, ['data-start', 'data-end', 'style']);
    
    // Additional clean up of specific inline styles if needed
    this.cleanInlineStyles(tempDiv);
    
    // Remove ALL span tags while preserving their content
    this.removeAllSpanTags(tempDiv);
    
    // Remove any elements that might be editor-specific
    this.removeEditorElements(tempDiv);
    
    // Remove empty tags after cleaning
    this.removeEmptyTags(tempDiv);
    
    return tempDiv.innerHTML;
  }

  /**
   * Remove text nodes containing unwanted text
   */
  private removeUnwantedTextNodes(element: Element, unwantedText: string): void {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodesToRemove: Node[] = [];
    let node;
    
    while (node = walker.nextNode()) {
      if (node.textContent?.includes(unwantedText)) {
        textNodesToRemove.push(node);
      }
    }
    
    textNodesToRemove.forEach(textNode => {
      textNode.parentNode?.removeChild(textNode);
    });
  }

  /**
   * Remove unwanted attributes from all elements
   */
  private removeUnwantedAttributes(element: Element, attributesToRemove: string[]): void {
    const allElements = element.querySelectorAll('*');
    
    allElements.forEach(el => {
      attributesToRemove.forEach(attr => {
        el.removeAttribute(attr);
      });
    });
    
    // Also remove from the root element
    attributesToRemove.forEach(attr => {
      element.removeAttribute(attr);
    });
  }

  /**
   * Remove elements that are editor-specific
   */
  private removeEditorElements(element: Element): void {
    // Remove elements with editor-specific classes or attributes
    const editorSelectors = [
      '.faq-editor-container',
      '.editor-header',
      '.editor-brand',
      '[contenteditable]',
      '.html-wysiwyg-editor'
    ];
    
    editorSelectors.forEach(selector => {
      const elementsToRemove = element.querySelectorAll(selector);
      elementsToRemove.forEach(el => {
        // If it's the root element, keep its content but remove the wrapper
        if (el === element) {
          return;
        }
        el.remove();
      });
    });
  }

  /**
   * Remove empty tags after cleaning styles and attributes
   */
  private removeEmptyTags(element: Element): void {
    // Define tags that should be removed if they become empty after cleaning
    // Note: Only remove truly unnecessary tags, preserve semantic and structural tags
    const emptyTagsToRemove = ['span', 'font'];
    
    emptyTagsToRemove.forEach(tagName => {
      const elements = Array.from(element.querySelectorAll(tagName));
      
      elements.forEach(el => {
        // Check if element is empty (no text content and no meaningful children)
        const hasText = (el.textContent?.trim().length ?? 0) > 0;
        const hasImportantChildren = el.querySelector('img, br, hr, input, textarea, select');
        
        if (!hasText && !hasImportantChildren) {
          // Move any children to parent before removing
          while (el.firstChild) {
            el.parentNode?.insertBefore(el.firstChild, el);
          }
          el.remove();
        }
      });
    });
  }

  /**
   * Clean specific inline styles that are commonly added by editors
   */
  private cleanInlineStyles(element: Element): void {
    const elementsWithStyle = element.querySelectorAll('[style]');
    
    elementsWithStyle.forEach(el => {
      const currentStyle = el.getAttribute('style') || '';
      
      // Define unwanted style patterns commonly added by editors
      const unwantedStylePatterns = [
        /color:\s*rgb\(51,\s*51,\s*51\)/gi,  // Specific gray color
        /font-family:\s*[^;]*Roboto[^;]*/gi,  // Roboto font family
        /font-family:\s*[^;]*sans-serif[^;]*/gi,  // Generic sans-serif
      ];
      
      let cleanedStyle = currentStyle;
      
      // Remove unwanted style patterns
      unwantedStylePatterns.forEach(pattern => {
        cleanedStyle = cleanedStyle.replace(pattern, '');
      });
      
      // Clean up extra semicolons and spaces
      cleanedStyle = cleanedStyle
        .replace(/;\s*;/g, ';')  // Remove double semicolons
        .replace(/^;\s*/, '')    // Remove leading semicolon
        .replace(/\s*;\s*$/, '') // Remove trailing semicolon
        .trim();
      
      // If no styles remain, remove the attribute entirely
      if (!cleanedStyle) {
        el.removeAttribute('style');
      } else {
        el.setAttribute('style', cleanedStyle);
      }
    });
  }

  /**
   * Remove ALL span tags while preserving their content
   */
  private removeAllSpanTags(element: Element): void {
    // Get all span elements - we need to process from innermost to outermost
    // to handle nested spans correctly
    let spanElements = Array.from(element.querySelectorAll('span'));
    
    // Process spans in reverse order (deepest first) to avoid DOM mutation issues
    spanElements.reverse().forEach(span => {
      // Create document fragment to hold span content
      const fragment = document.createDocumentFragment();
      
      // Move all child nodes from span to fragment
      while (span.firstChild) {
        fragment.appendChild(span.firstChild);
      }
      
      // Insert the fragment content before the span
      span.parentNode?.insertBefore(fragment, span);
      
      // Remove the empty span
      span.remove();
    });
  }
}