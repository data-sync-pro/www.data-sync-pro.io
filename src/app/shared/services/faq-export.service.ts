import { Injectable } from '@angular/core';
import { FAQStorageService, EditedFAQ } from './faq-storage.service';
import { FAQService } from './faq.service';
import { FAQItem } from '../models/faq.model';

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
    
    // Merge edited FAQs with original data
    const mergedFAQs = this.mergeFAQData(allFAQs, editedFAQs);
    
    // Prepare HTML content map
    const htmlContent: { [key: string]: string } = {};
    editedFAQs.forEach(faq => {
      const fileName = this.getHTMLFileName(faq.faqId);
      if (fileName) {
        htmlContent[fileName] = faq.answer;
      }
    });

    const exportData: ExportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: this.EXPORT_VERSION,
        itemCount: allFAQs.length,
        editedCount: editedFAQs.length
      },
      faqs: mergedFAQs,
      htmlContent: htmlContent
    };

    return exportData;
  }

  private mergeFAQData(originalFAQs: FAQItem[], editedFAQs: EditedFAQ[]): any[] {
    const editedMap = new Map<string, EditedFAQ>();
    editedFAQs.forEach(faq => {
      editedMap.set(faq.faqId, faq);
    });

    return originalFAQs.map(faq => {
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
  }

  private getHTMLFileName(faqId: string): string | null {
    const faq = this.faqService.getAllFAQs().find(f => f.id === faqId);
    return faq?.answerPath || null;
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
      const blob = new Blob([content], { type: 'text/html' });
      this.downloadFile(blob, fileName);
    });
  }

  async downloadAsZip(data: ExportData): Promise<void> {
    // Note: For ZIP functionality, we would need to install JSZip library
    // For now, we'll download files separately
    console.warn('ZIP download not yet implemented. Downloading files separately.');
    
    // Download main FAQ JSON
    this.downloadFAQsJSON(data);
    
    // Download HTML files with a small delay between each
    const entries = Object.entries(data.htmlContent);
    for (let i = 0; i < entries.length; i++) {
      const [fileName, content] = entries[i];
      setTimeout(() => {
        const blob = new Blob([content], { type: 'text/html' });
        this.downloadFile(blob, fileName);
      }, i * 100);
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
}