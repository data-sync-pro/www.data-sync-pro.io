import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { FAQService } from '../shared/services/faq.service';
import { FAQStorageService, EditedFAQ } from '../shared/services/faq-storage.service';
import { FAQExportService, ExportData } from '../shared/services/faq-export.service';
import { FAQItem } from '../shared/models/faq.model';

interface EditorState {
  selectedFAQ: FAQItem | null;
  isEditing: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  lastSaved: Date | null;
  showVersionHistory: boolean;
  showExportDialog: boolean;
  showImportDialog: boolean;
}

@Component({
  selector: 'app-faq-editor',
  templateUrl: './faq-editor.component.html',
  styleUrls: ['./faq-editor.component.scss']
})
export class FaqEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('htmlSourceEditor', { static: false }) htmlSourceEditor!: ElementRef;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;
  
  private destroy$ = new Subject<void>();
  private autoSaveTimer: any;
  
  faqList: FAQItem[] = [];
  filteredFAQs: FAQItem[] = [];
  editedFAQs = new Map<string, EditedFAQ>();
  versionHistory: EditedFAQ[] = [];
  
  state: EditorState = {
    selectedFAQ: null,
    isEditing: false,
    isLoading: false,
    isSaving: false,
    hasChanges: false,
    lastSaved: null,
    showVersionHistory: false,
    showExportDialog: false,
    showImportDialog: false
  };
  
  searchQuery = '';
  selectedCategory = '';
  categories: string[] = [];
  
  editorContent = '';
  currentQuestion = '';
  currentCategory = '';
  previewContent: SafeHtml = '';
  
  storageStats = { used: 0, available: 0, percentage: 0 };

  constructor(
    private http: HttpClient,
    private faqService: FAQService,
    private storageService: FAQStorageService,
    private exportService: FAQExportService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadFAQData();
    this.loadEditedFAQs();
    this.updateStorageStats();
    
    // Auto-save every 30 seconds when there are changes
    this.autoSaveTimer = setInterval(() => {
      if (this.state.hasChanges && this.state.selectedFAQ) {
        this.saveFAQ();
      }
    }, 30000);
  }

  ngAfterViewInit(): void {
    // HTML source editor is ready to use - no initialization needed
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    // Save any pending changes
    if (this.state.hasChanges && this.state.selectedFAQ) {
      this.saveFAQ();
    }
  }


  private loadFAQData(): void {
    this.faqService.getFAQs()
      .pipe(takeUntil(this.destroy$))
      .subscribe(faqs => {
        this.faqList = faqs;
        this.filteredFAQs = faqs;
        this.extractCategories();
      });
  }

  private loadEditedFAQs(): void {
    this.storageService.getEditedFAQs()
      .pipe(takeUntil(this.destroy$))
      .subscribe(edited => {
        this.editedFAQs = edited;
      });
  }

  private extractCategories(): void {
    const categorySet = new Set<string>();
    this.faqList.forEach(faq => {
      if (faq.category) {
        categorySet.add(faq.category);
      }
    });
    this.categories = Array.from(categorySet).sort();
  }

  private updateStorageStats(): void {
    this.storageService.getStorageStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.storageStats = {
          used: stats.used,
          available: stats.available,
          percentage: stats.available > 0 ? (stats.used / stats.available) * 100 : 0
        };
      });
  }

  selectFAQ(faq: FAQItem): void {
    // Save current FAQ if there are changes
    if (this.state.hasChanges && this.state.selectedFAQ) {
      this.saveFAQ();
    }

    console.log('Selecting FAQ:', faq.id, faq.question);
    this.state.selectedFAQ = faq;
    this.state.isLoading = true; // Show loading indicator
    this.currentQuestion = faq.question;
    this.currentCategory = faq.category;
    
    // Load edited content if exists (should be original HTML source)
    const edited = this.editedFAQs.get(faq.id);
    if (edited) {
      this.editorContent = edited.answer; // This should be original HTML source
      this.currentQuestion = edited.question;
      this.currentCategory = edited.category;
      
      // Content is already set in editorContent via ngModel binding
      console.log('✅ Edited HTML content set in textarea:', edited.answer);
      this.state.isLoading = false;
      
      // Update preview with full FAQ service processing
      this.updatePreviewFromFAQService(faq);
    } else {
      // Load original content
      this.loadOriginalContent(faq);
    }
    
    this.state.hasChanges = false;
  }

  private loadOriginalContent(faq: FAQItem): void {
    console.log('Loading original HTML content for editing:', faq.id, 'answerPath:', faq.answerPath);
    
    // Load raw HTML content for editing (minimal processing)
    this.loadRawHTMLForEditing(faq.answerPath)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rawHtmlContent) => {
          console.log('Received raw HTML content for editing');
          
          // Minimal processing - only decode HTML entities, preserve all HTML structure
          const editableContent = this.prepareContentForEditing(rawHtmlContent);
          console.log('Prepared content for editing:', editableContent);
          
          this.editorContent = editableContent;
          
          // Content is automatically displayed in textarea via ngModel binding
          console.log('✅ HTML source content set in textarea');
          console.log('📄 Content now in editor:', editableContent);
          this.state.isLoading = false;
          
          // Update preview with fully processed content
          this.updatePreviewFromFAQService(faq);
        },
        error: (error) => {
          console.error('❌ Error loading raw HTML content:', error);
          this.editorContent = '<p>Error loading content</p>';
          this.state.isLoading = false;
          this.updatePreviewFromFAQService(faq);
        }
      });
  }

  saveFAQ(): void {
    if (!this.state.selectedFAQ) return;
    
    this.state.isSaving = true;
    
    const faqData: Partial<EditedFAQ> = {
      faqId: this.state.selectedFAQ.id,
      question: this.currentQuestion,
      answer: this.editorContent,
      category: this.currentCategory,
      subCategory: this.state.selectedFAQ.subCategory || undefined
    };

    this.storageService.saveFAQ(faqData).then(success => {
      if (success) {
        this.state.hasChanges = false;
        this.state.lastSaved = new Date();
        this.loadEditedFAQs();
      }
      this.state.isSaving = false;
    });
  }

  /**
   * Handle changes in the HTML source editor
   */
  onEditorContentChange(): void {
    this.state.hasChanges = true;
    // Update preview with simple sanitization for real-time editing
    // Note: Full FAQ service processing would be too slow for real-time updates
    this.updatePreview();
  }

  discardChanges(): void {
    if (this.state.selectedFAQ) {
      console.log('Discarding changes and reloading original content');
      this.selectFAQ(this.state.selectedFAQ);
    }
  }

  /**
   * Update preview using simple sanitization (fallback method)
   */
  private updatePreview(): void {
    this.previewContent = this.sanitizer.bypassSecurityTrustHtml(this.editorContent);
  }

  /**
   * Update preview using full FAQ service processing pipeline
   * This shows what users will actually see on the FAQ pages
   */
  private updatePreviewFromFAQService(faq: FAQItem): void {
    if (!faq || !faq.answerPath) {
      this.updatePreview(); // Fallback to simple preview
      return;
    }

    console.log('Updating preview with full FAQ service processing for:', faq.answerPath);
    
    this.faqService.getFAQContent(faq.answerPath)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (processedContent) => {
          console.log('Received fully processed content for preview');
          this.previewContent = processedContent;
        },
        error: (error) => {
          console.error('Error getting processed content for preview:', error);
          this.updatePreview(); // Fallback to simple preview
        }
      });
  }

  filterFAQs(): void {
    this.filteredFAQs = this.faqList.filter(faq => {
      const matchesSearch = !this.searchQuery || 
        faq.question.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        faq.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesCategory = !this.selectedCategory || 
        faq.category === this.selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }

  async showVersionHistory(): Promise<void> {
    if (!this.state.selectedFAQ) return;
    
    this.versionHistory = await this.storageService.getVersionHistory(this.state.selectedFAQ.id);
    this.state.showVersionHistory = true;
  }

  async restoreVersion(version: EditedFAQ): Promise<void> {
    const success = await this.storageService.restoreVersion(version.id);
    if (success && this.state.selectedFAQ) {
      this.state.showVersionHistory = false;
      this.selectFAQ(this.state.selectedFAQ);
    }
  }

  async exportAll(): Promise<void> {
    const exportData = await this.exportService.exportAllEdits();
    
    // Download files
    this.exportService.downloadFAQsJSON(exportData);
    this.exportService.downloadInstructions(exportData);
    
    // Download HTML files with delay
    setTimeout(() => {
      this.exportService.downloadHTMLFiles(exportData);
    }, 1000);
    
    this.state.showExportDialog = false;
  }

  async exportJSON(): Promise<void> {
    const exportData = await this.exportService.exportAllEdits();
    this.exportService.downloadAsJSON(exportData);
    this.state.showExportDialog = false;
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const success = await this.exportService.importFromJSON(file);
    
    if (success) {
      this.loadEditedFAQs();
      alert('Import successful!');
    } else {
      alert('Import failed. Please check the file format.');
    }
    
    this.state.showImportDialog = false;
    input.value = '';
  }

  async clearAllEdits(): Promise<void> {
    if (confirm('Are you sure you want to clear all edits? This cannot be undone.')) {
      const success = await this.storageService.clearAllEdits();
      if (success) {
        this.loadEditedFAQs();
        if (this.state.selectedFAQ) {
          this.selectFAQ(this.state.selectedFAQ);
        }
      }
    }
  }

  getEditedCount(): number {
    return this.editedFAQs.size;
  }

  isEdited(faq: FAQItem): boolean {
    return this.editedFAQs.has(faq.id);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(date: Date | null): string {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  /**
   * Load raw HTML content for editing - completely preserve source file
   */
  private loadRawHTMLForEditing(answerPath: string): Observable<string> {
    const fullPath = `assets/faq-item/${answerPath}`;
    console.log('📁 Loading raw HTML file for editing from:', fullPath);
    
    return this.http.get(fullPath, { responseType: 'text' }).pipe(
      map((content: string) => {
        console.log('📄 Raw HTML file content loaded:');
        console.log('📄 ===== ORIGINAL FILE CONTENT START =====');
        console.log(content);
        console.log('📄 ===== ORIGINAL FILE CONTENT END =====');
        console.log(`📊 Content length: ${content.length} characters`);
        
        // Return exactly as-is - NO processing whatsoever
        return content;
      }),
      catchError((error: any) => {
        console.error('❌ Error loading raw HTML file for editing:', error);
        return of('<p>Error loading content</p>');
      })
    );
  }


  /**
   * Prepare content for editing - preserve original HTML source as much as possible
   */
  private prepareContentForEditing(content: string): string {
    console.log('🔍 Original content received:', content);
    
    // MINIMAL processing - only remove obvious security threats
    let prepared = content
      // Remove potential security threats only
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '');
    
    // NO HTML entity decoding - preserve exactly as written in source file
    // NO whitespace normalization - preserve original formatting
    
    console.log('✅ Content prepared for editing (original HTML preserved):', prepared);
    return prepared; // Don't even trim - preserve exact original content
  }
}