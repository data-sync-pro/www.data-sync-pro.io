import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FAQStorageService, EditedFAQ } from './faq-storage.service';
import { FAQService } from './faq.service';
import { FAQItem } from '../models/faq.model';
import { firstValueFrom } from 'rxjs';
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
    private http: HttpClient,
    private storageService: FAQStorageService,
    private faqService: FAQService
  ) {}

  /**
   * Extract image references from HTML content
   */
  private extractImageReferencesFromHTML(htmlContent: { [key: string]: string }): Set<string> {
    const imageRefs = new Set<string>();
    const imageRegex = /(?:src|href)\s*=\s*['"](assets\/image\/[^'"]+)['"]/gi;
    
    for (const content of Object.values(htmlContent)) {
      let match;
      while ((match = imageRegex.exec(content)) !== null) {
        imageRefs.add(match[1]); // match[1] is the captured group (the image path)
      }
    }
    
    return imageRefs;
  }

  /**
   * Fetch original image from assets folder
   */
  private async fetchOriginalImage(imagePath: string): Promise<File | null> {
    try {
      const response = await firstValueFrom(this.http.get(imagePath, { responseType: 'blob' }));
      
      // Extract filename from path
      const filename = imagePath.split('/').pop() || 'image';
      
      // Convert blob to File object
      const file = new File([response], filename, { 
        type: response.type || 'image/jpeg' 
      });
      
      return file;
    } catch (error) {
      console.warn(`Failed to fetch original image ${imagePath}:`, error);
      return null;
    }
  }

  /**
   * Get all original images referenced in HTML content
   */
  private async fetchAllOriginalImages(htmlContent: { [key: string]: string }): Promise<Map<string, File>> {
    const imageRefs = this.extractImageReferencesFromHTML(htmlContent);
    const originalImages = new Map<string, File>();
    
    for (const imagePath of imageRefs) {
      const imageFile = await this.fetchOriginalImage(imagePath);
      if (imageFile) {
        originalImages.set(imagePath, imageFile);
      }
    }
    
    return originalImages;
  }

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
        const cleanedContent = this.cleanHTMLContent(faq.answer);
        htmlContent[fileName] = this.decodeHTMLEntities(cleanedContent);
      }
    });
    
    // Add HTML content for new FAQs
    newFAQs.forEach(faq => {
      const fileName = this.generateHTMLFileNameForNewFAQ(faq);
      const cleanedContent = this.cleanHTMLContent(faq.answer);
      htmlContent[fileName] = this.decodeHTMLEntities(cleanedContent);
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
          Answer__c: faq.answerPath,
          isActive: edited.isActive !== false // Use edited isActive value
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
        Answer__c: faq.answerPath,
        isActive: faq.isActive !== false
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
        Answer__c: htmlFileName,
        isActive: faq.isActive !== false // Use the actual isActive value from the edited FAQ
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

  async downloadAsZip(data: ExportData, progressCallback?: (progress: ExportProgress) => void, tempImages?: Map<string, File>): Promise<void> {
    const zip = new JSZip();
    
    // Get original images referenced in HTML content
    const originalImages = await this.fetchAllOriginalImages(data.htmlContent);
    
    const tempImageCount = tempImages ? tempImages.size : 0;
    const originalImageCount = originalImages.size;
    const totalItems = Object.keys(data.htmlContent).length + 3 + tempImageCount + originalImageCount; // HTML files + JSON + instructions + metadata + temp images + original images
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

      // Add temporary images if provided
      if (tempImages && tempImages.size > 0) {
        for (const [imagePath, imageFile] of tempImages.entries()) {
          // Create the directory structure: src/assets/image/[faq-id]/
          const zipImagePath = `src/${imagePath}`;
          zip.file(zipImagePath, imageFile);
          updateProgress(`Adding image ${imageFile.name}`);
        }
      }

      // Add original images referenced in HTML content
      if (originalImages.size > 0) {
        for (const [imagePath, imageFile] of originalImages.entries()) {
          // Create the directory structure: src/assets/image/[faq-id]/
          const zipImagePath = `src/${imagePath}`;
          zip.file(zipImagePath, imageFile);
          updateProgress(`Adding original image ${imageFile.name}`);
        }
      }

      // Add instructions (updated to include image instructions)
      const instructions = this.generateUpdateInstructions(data, tempImages, originalImages);
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

          // Convert and import the data
          const success = await this.processImportData(data);
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

  async importFromZip(file: File): Promise<boolean> {
    try {
      console.log('Starting ZIP import for file:', file.name);
      
      // Read the ZIP file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Extract and parse faqs.json
      const faqsJsonFile = zipContent.file('faqs.json');
      if (!faqsJsonFile) {
        console.error('faqs.json not found in ZIP file');
        return false;
      }
      
      const faqsJsonContent = await faqsJsonFile.async('string');
      let faqsData: any[];
      
      try {
        faqsData = JSON.parse(faqsJsonContent);
      } catch (error) {
        console.error('Invalid JSON in faqs.json:', error);
        return false;
      }
      
      // Extract HTML content files
      const htmlContent: { [key: string]: string } = {};
      const htmlFolder = zipContent.folder('html-content');
      
      if (htmlFolder) {
        // Process each HTML file in the html-content folder
        for (const [relativePath, file] of Object.entries(htmlFolder.files)) {
          if (file && !file.dir && relativePath.endsWith('.html')) {
            const fileName = relativePath.split('/').pop() || relativePath;
            const htmlFileContent = await file.async('string');
            htmlContent[fileName] = htmlFileContent;
            console.log(`Extracted HTML file: ${fileName}`);
          }
        }
      }
      
      // Extract metadata (optional)
      let metadata: any = {
        exportDate: new Date().toISOString(),
        version: this.EXPORT_VERSION,
        itemCount: faqsData.length,
        editedCount: faqsData.length
      };
      
      const metadataFile = zipContent.file('export-metadata.json');
      if (metadataFile) {
        try {
          const metadataContent = await metadataFile.async('string');
          metadata = JSON.parse(metadataContent);
        } catch (error) {
          console.warn('Could not parse metadata, using defaults:', error);
        }
      }
      
      // Construct ExportData object
      const data: ExportData = {
        metadata,
        faqs: faqsData,
        htmlContent
      };
      
      // Validate the extracted data
      if (!this.validateExportData(data)) {
        console.error('Invalid export data format in ZIP file');
        return false;
      }
      
      console.log(`ZIP import: Found ${faqsData.length} FAQs and ${Object.keys(htmlContent).length} HTML files`);
      
      // Process and import the data
      const success = await this.processImportData(data);
      
      if (success) {
        console.log('ZIP import completed successfully');
      } else {
        console.error('ZIP import failed during data processing');
      }
      
      return success;
      
    } catch (error) {
      console.error('Error importing ZIP file:', error);
      return false;
    }
  }

  private async processImportData(data: ExportData): Promise<boolean> {
    try {
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
            answer: this.decodeHTMLEntities(htmlContent),
            category: faq.Category__c,
            subCategory: faq.SubCategory__c,
            timestamp: Date.now(),
            version: 1
          });
        }
      }

      // Import to storage
      const success = await this.storageService.importEdits(editedFAQs);
      return success;
    } catch (error) {
      console.error('Error processing import data:', error);
      return false;
    }
  }

  private validateExportData(data: any): data is ExportData {
    return data &&
      data.metadata &&
      data.metadata.version &&
      Array.isArray(data.faqs) &&
      data.htmlContent &&
      typeof data.htmlContent === 'object';
  }

  generateUpdateInstructions(data: ExportData, tempImages?: Map<string, File>, originalImages?: Map<string, File>): string {
    const hasImages = (tempImages && tempImages.size > 0) || (originalImages && originalImages.size > 0);
    const totalImageCount = (tempImages?.size || 0) + (originalImages?.size || 0);
    
    const imageInstructions = hasImages ? `

3. Update Image Files (${totalImageCount} files total):
   - Copy all image files from src/assets/image/ to your project's src/assets/image/ directory
   - The following image files are included:
${tempImages && tempImages.size > 0 ? Array.from(tempImages!.entries()).map(([path, file]) => `     - ${path} (${file.name}) [New]`).join('\n') : ''}${tempImages && tempImages.size > 0 && originalImages && originalImages.size > 0 ? '\n' : ''}${originalImages && originalImages.size > 0 ? Array.from(originalImages!.entries()).map(([path, file]) => `     - ${path} (${file.name}) [Original]`).join('\n') : ''}
   - Ensure the directory structure is preserved: src/assets/image/[faq-id]/[faq-id]-[sequence].[ext]

4. Rebuild the Application:
   - Run: npm run build
   - Test the changes locally: npm start

5. Commit Changes:
   - git add src/assets/data/faqs.json
   - git add src/assets/faq-item/
   - git add src/assets/image/
   - git commit -m "Update FAQ content and images from editor"` : `

3. Rebuild the Application:
   - Run: npm run build
   - Test the changes locally: npm start

4. Commit Changes:
   - git add src/assets/data/faqs.json
   - git add src/assets/faq-item/
   - git commit -m "Update FAQ content from editor"`;

    const instructions = `
FAQ Export Update Instructions
===============================
Export Date: ${data.metadata.exportDate}
Total FAQs: ${data.metadata.itemCount}
Edited FAQs: ${data.metadata.editedCount}${hasImages ? `
Total Images: ${totalImageCount}${tempImages && tempImages.size > 0 ? ` (${tempImages.size} new)` : ''}${originalImages && originalImages.size > 0 ? ` (${originalImages.size} original)` : ''}` : ''}

How to Update Your Codebase:
-----------------------------

1. Update FAQ Data:
   - Replace src/assets/data/faqs.json with the exported faqs.json file

2. Update HTML Content:
   - Copy all exported HTML files to src/assets/faq-item/
   - The following files need to be updated:
${Object.keys(data.htmlContent).map(file => `     - ${file}`).join('\n')}${imageInstructions}

Notes:
------
- Make sure to backup existing files before replacing
- Review all changes before committing to version control
- Test thoroughly in development before deploying to production${hasImages ? `
- Image files are organized by FAQ ID to avoid conflicts
- Image paths in HTML content use [IMG: assets/image/...] format for proper linking${originalImages && originalImages.size > 0 ? `
- Original images are included to ensure all references work correctly` : ''}` : ''}
`;

    return instructions;
  }

  downloadInstructions(data: ExportData, tempImages?: Map<string, File>, originalImages?: Map<string, File>): void {
    const instructions = this.generateUpdateInstructions(data, tempImages, originalImages);
    const blob = new Blob([instructions], { type: 'text/plain' });
    this.downloadFile(blob, 'UPDATE_INSTRUCTIONS.txt');
  }

  /**
   * Clean HTML content by removing unwanted text and attributes using string operations
   * This avoids DOM manipulation that causes HTML entity encoding
   */
  public cleanHTMLContent(content: string): string {
    if (!content) return content;
    
    let cleaned = content;
    
    // Remove unwanted text nodes that contain "faq-editor"
    cleaned = this.removeUnwantedTextNodesString(cleaned, 'faq-editor');
    
    // Remove all attributes from all elements except img src
    cleaned = this.removeUnwantedAttributesString(cleaned);
    
    // Remove ALL span tags while preserving their content
    cleaned = this.removeAllSpanTagsString(cleaned);
    
    // Remove any elements that might be editor-specific
    cleaned = this.removeEditorElementsString(cleaned);
    
    // Remove empty tags after cleaning (recursively)
    cleaned = this.removeEmptyTagsString(cleaned);
    
    return cleaned;
  }


  /**
   * Decode HTML entities to actual characters
   */
  public decodeHTMLEntities(content: string): string {
    if (!content) return content;
    
    // Map of HTML entities to their corresponding characters
    const entityMap: { [key: string]: string } = {
      '&amp;': '&',
      '&lt;': '<', 
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',  // Convert to regular space
      '&mdash;': '—',
      '&ndash;': '–',
      '&hellip;': '…',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™'
    };
    
    let decoded = content;
    
    // Replace named entities
    for (const [entity, char] of Object.entries(entityMap)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), char);
    }
    
    // Handle numeric character references like &#39; &#8217; etc.
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(parseInt(dec, 10));
    });
    
    // Handle hexadecimal character references like &#x27; &#x2019; etc.
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    
    return decoded;
  }

  /**
   * String-based methods to avoid HTML entity encoding
   */
  
  private removeUnwantedTextNodesString(content: string, unwantedText: string): string {
    // Remove text content containing the unwanted text
    return content.replace(new RegExp(unwantedText, 'gi'), '');
  }
  
  private removeUnwantedAttributesString(content: string): string {
    // Remove all attributes from all tags except img src
    return content.replace(/<(\w+)([^>]*?)>/gi, (match, tagName, attributes) => {
      if (tagName.toLowerCase() === 'img') {
        // For img tags, only keep src attribute
        const srcMatch = attributes.match(/\s+src\s*=\s*["']([^"']*?)["']/i);
        if (srcMatch) {
          return `<${tagName} src="${srcMatch[1]}">`;
        }
        return `<${tagName}>`;
      } else {
        // For all other tags, remove all attributes
        return `<${tagName}>`;
      }
    });
  }
  
  private removeAllSpanTagsString(content: string): string {
    // Remove span tags but preserve their content
    return content.replace(/<\/?span[^>]*>/gi, '');
  }
  
  private removeEditorElementsString(content: string): string {
    // Remove editor-specific elements
    let cleaned = content;
    
    // Remove elements with editor-specific classes or attributes
    cleaned = cleaned.replace(/<[^>]*class\s*=\s*["'][^"']*(?:faq-editor|editor-|html-wysiwyg)[^"']*["'][^>]*>.*?<\/[^>]+>/gis, '');
    cleaned = cleaned.replace(/<[^>]*contenteditable[^>]*>.*?<\/[^>]+>/gis, '');
    
    return cleaned;
  }
  
  private removeEmptyTagsString(content: string): string {
    let cleaned = content;
    let hasChanges = false;
    
    do {
      hasChanges = false;
      const beforeLength = cleaned.length;
      
      // Remove empty tags (but preserve self-closing important tags)
      // First handle paired tags that are completely empty
      cleaned = cleaned.replace(/<((?!(?:br|hr|img|input|textarea|select|iframe|video|audio|canvas|svg|area|base|col|embed|link|meta|param|source|track|wbr)\b)\w+)[^>]*>\s*<\/\1>/gi, '');
      
      // Then handle tags that only contain whitespace or &nbsp;
      cleaned = cleaned.replace(/<((?!(?:br|hr|img|input|textarea|select|iframe|video|audio|canvas|svg|area|base|col|embed|link|meta|param|source|track|wbr)\b)\w+)[^>]*>(?:\s|&nbsp;)*<\/\1>/gi, '');
      
      hasChanges = cleaned.length !== beforeLength;
    } while (hasChanges);
    
    return cleaned;
  }

}