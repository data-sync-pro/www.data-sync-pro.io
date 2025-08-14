import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { FAQService } from '../shared/services/faq.service';
import { FAQStorageService, EditedFAQ } from '../shared/services/faq-storage.service';
import { FAQExportService, ExportData, ExportProgress } from '../shared/services/faq-export.service';
import { FAQItem } from '../shared/models/faq.model';
import { NotificationService } from '../shared/services/notification.service';
import { html_beautify } from 'js-beautify';

interface EditHistory {
  content: string;
  selection: { start: number, end: number };
  timestamp: number;
  description: string;
}

class UndoRedoManager {
  private history: EditHistory[] = [];
  private currentIndex = -1;
  private readonly maxHistory = 50;

  saveState(content: string, selection: { start: number, end: number }, description: string = 'Edit'): void {
    // Remove any redo history when new change is made
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new state
    this.history.push({
      content,
      selection,
      timestamp: Date.now(),
      description
    });

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  undo(): EditHistory | null {
    if (this.canUndo()) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }

  redo(): EditHistory | null {
    if (this.canRedo()) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  getCurrentState(): EditHistory | null {
    return this.currentIndex >= 0 ? this.history[this.currentIndex] : null;
  }

  getHistoryInfo(): { canUndo: boolean, canRedo: boolean, historySize: number } {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      historySize: this.history.length
    };
  }
}

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
  saveError: string | null;
  isExporting: boolean;
  exportProgress: ExportProgress | null;
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
  private contentChangeSubject = new Subject<string>();
  private smartAutoSaveTimer: any;
  private undoRedoManager = new UndoRedoManager();
  private isUndoRedoOperation = false;
  private isFormattingOperation = false;
  
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
    showImportDialog: false,
    saveError: null,
    isExporting: false,
    exportProgress: null
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
    private sanitizer: DomSanitizer,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadFAQData();
    this.loadEditedFAQs();
    this.updateStorageStats();
    
    // Setup smart auto-save with debouncing
    this.setupSmartAutoSave();
    
    // Keep the original timer as fallback
    this.autoSaveTimer = setInterval(() => {
      if (this.state.hasChanges && this.state.selectedFAQ) {
        this.saveFAQ(true); // true indicates auto-save
      }
    }, 120000); // Increased to 2 minutes since we have smart auto-save
  }

  private setupSmartAutoSave(): void {
    this.contentChangeSubject.pipe(
      debounceTime(3000), // Wait for user to stop typing for 3 seconds
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.state.hasChanges && this.state.selectedFAQ) {
        this.saveFAQ(true); // Auto-save
      }
    });
  }

  ngAfterViewInit(): void {
    // HTML source editor is ready to use - no initialization needed
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Only apply HTML editing shortcuts when textarea is focused
    const isTextareaFocused = event.target === this.htmlSourceEditor?.nativeElement;
    
    // Ctrl+S or Cmd+S for save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (this.state.hasChanges && this.state.selectedFAQ) {
        this.saveFAQ();
      }
    }
    
    // HTML formatting and text editing shortcuts (only when textarea is focused)
    if (isTextareaFocused && this.state.selectedFAQ) {
      // Alt+Shift+F for HTML format (VS Code standard)
      if (event.altKey && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        this.formatHTML();
        return;
      }
      
      // Ctrl+B for bold
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        this.wrapSelectedText('<strong>', '</strong>');
        return;
      }
      
      // Ctrl+I for italic
      if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
        event.preventDefault();
        this.wrapSelectedText('<em>', '</em>');
        return;
      }
      
      // Ctrl+U for underline
      if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
        event.preventDefault();
        this.wrapSelectedText('<u>', '</u>');
        return;
      }
      
      // Ctrl+K for link
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        this.insertLink();
        return;
      }
    }
    
    // Ctrl+Z for undo (when textarea is focused)
    if (isTextareaFocused && (event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.performUndo();
      return;
    }
    
    // Ctrl+Y or Ctrl+Shift+Z for redo (when textarea is focused)
    if (isTextareaFocused && (event.ctrlKey || event.metaKey) && 
        (event.key === 'y' || (event.shiftKey && event.key === 'z'))) {
      event.preventDefault();
      this.performRedo();
      return;
    }
    
    
    // Escape to close dialogs
    if (event.key === 'Escape') {
      this.state.showExportDialog = false;
      this.state.showImportDialog = false;
      this.state.showVersionHistory = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    if (this.smartAutoSaveTimer) {
      clearTimeout(this.smartAutoSaveTimer);
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
    
    // Clear undo history when switching FAQs
    this.clearUndoHistory();
    
    // Load edited content if exists (should be original HTML source)
    const edited = this.editedFAQs.get(faq.id);
    if (edited) {
      this.editorContent = edited.answer; // This should be original HTML source
      this.currentQuestion = edited.question;
      this.currentCategory = edited.category;
      
      // Content is already set in editorContent via ngModel binding
      console.log('✅ Edited HTML content set in textarea:', edited.answer);
      this.state.isLoading = false;
      
      // Initialize undo state
      this.initializeUndoState();
      
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
          
          // Initialize undo state
          this.initializeUndoState();
          
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

  saveFAQ(isAutoSave = false): void {
    if (!this.state.selectedFAQ) return;
    
    this.state.isSaving = true;
    this.state.saveError = null;
    
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
        this.state.saveError = null;
        this.loadEditedFAQs();
        
        // Show notification only for manual saves
        if (!isAutoSave) {
          this.notificationService.saveSuccess(this.getTruncatedTitle(this.currentQuestion));
        }
        // Auto-save is silent - no notification needed
      } else {
        this.state.saveError = 'Failed to save to storage';
        this.notificationService.saveError(
          this.getTruncatedTitle(this.currentQuestion), 
          this.state.saveError || undefined
        );
      }
      this.state.isSaving = false;
    }).catch(error => {
      this.state.saveError = error.message || 'Unknown error occurred';
      this.notificationService.saveError(
        this.getTruncatedTitle(this.currentQuestion), 
        this.state.saveError || undefined
      );
      this.state.isSaving = false;
      console.error('Save error:', error);
    });
  }

  private getTruncatedTitle(title: string, maxLength = 40): string {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  }

  /**
   * Handle changes in the HTML source editor
   */
  onEditorContentChange(): void {
    this.state.hasChanges = true;
    this.state.saveError = null;
    
    // Update preview with simple sanitization for real-time editing
    // Note: Full FAQ service processing would be too slow for real-time updates
    this.updatePreview();
    
    // Save state for undo/redo (but only if this isn't an undo/redo or formatting operation)
    if (!this.isUndoRedoOperation && !this.isFormattingOperation) {
      const textarea = this.htmlSourceEditor?.nativeElement;
      if (textarea) {
        const selection = {
          start: textarea.selectionStart || 0,
          end: textarea.selectionEnd || 0
        };
        this.undoRedoManager.saveState(this.editorContent, selection, 'Content change');
      }
    }
    
    // Trigger smart auto-save
    this.contentChangeSubject.next(this.editorContent);
  }

  resetCurrentFAQ(): void {
    if (!this.state.selectedFAQ) return;

    // Save current state to undo system before resetting
    const textarea = this.htmlSourceEditor?.nativeElement;
    if (textarea) {
      const currentSelection = {
        start: textarea.selectionStart || 0,
        end: textarea.selectionEnd || 0
      };
      this.undoRedoManager.saveState(this.editorContent, currentSelection, 'FAQ reset');
    }

    console.log('Resetting current FAQ to original content');
    this.selectFAQ(this.state.selectedFAQ);
    
    // Show notification
    this.notificationService.resetWarning(this.getTruncatedTitle(this.state.selectedFAQ.question));
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
    this.state.isExporting = true;
    this.state.exportProgress = null;
    
    try {
      const exportData = await this.exportService.exportAllEdits();
      
      // Use new ZIP export with progress tracking
      await this.exportService.downloadAsZip(exportData, (progress: ExportProgress) => {
        this.state.exportProgress = progress;
      });
      
      this.notificationService.exportSuccess(Object.keys(exportData.htmlContent).length);
      this.state.showExportDialog = false;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred during export';
      this.notificationService.exportError(errorMessage);
      console.error('Export error:', error);
    } finally {
      this.state.isExporting = false;
      this.state.exportProgress = null;
    }
  }

  async exportSeparateFiles(): Promise<void> {
    this.state.isExporting = true;
    
    try {
      const exportData = await this.exportService.exportAllEdits();
      
      // Download files separately (legacy method)
      this.exportService.downloadFAQsJSON(exportData);
      this.exportService.downloadInstructions(exportData);
      
      // Download HTML files with delay
      setTimeout(() => {
        this.exportService.downloadHTMLFiles(exportData);
      }, 1000);
      
      this.notificationService.exportSuccess(Object.keys(exportData.htmlContent).length + 2);
      this.state.showExportDialog = false;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred during export';
      this.notificationService.exportError(errorMessage);
      console.error('Export error:', error);
    } finally {
      this.state.isExporting = false;
    }
  }

  async exportJSON(): Promise<void> {
    this.state.isExporting = true;
    
    try {
      const exportData = await this.exportService.exportAllEdits();
      this.exportService.downloadAsJSON(exportData);
      this.notificationService.exportSuccess(1);
      this.state.showExportDialog = false;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred during export';
      this.notificationService.exportError(errorMessage);
      console.error('Export JSON error:', error);
    } finally {
      this.state.isExporting = false;
    }
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

  // HTML Editor Enhancement Functions

  /**
   * Format HTML content using js-beautify
   */
  formatHTML(): void {
    if (!this.editorContent.trim()) {
      this.notificationService.warning('No content to format');
      return;
    }

    try {
      const formatted = html_beautify(this.editorContent, {
        indent_size: 2,
        wrap_line_length: 100,
        preserve_newlines: true,
        max_preserve_newlines: 2,
        indent_inner_html: true,
        unformatted: ['pre', 'code'],
        extra_liners: ['head', 'body', '/html']
      });

      this.editorContent = formatted;
      this.onEditorContentChange();
      this.notificationService.success('HTML formatted successfully');
    } catch (error) {
      console.error('HTML formatting error:', error);
      this.notificationService.error('Failed to format HTML');
    }
  }

  /**
   * Wrap selected text with HTML tags (with smart toggle and undo support)
   */
  wrapSelectedText(startTag: string, endTag: string): void {
    const textarea = this.htmlSourceEditor.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // 关键修复：使用 textarea 的实际内容，确保数据源一致
    const textareaContent = textarea.value;
    const selectedText = textareaContent.substring(start, end);
    
    // Save current state for undo before making changes
    const currentSelection = {
      start: start,
      end: end
    };
    this.undoRedoManager.saveState(textareaContent, currentSelection, 'Text formatting');

    // Smart tag detection and toggle using consistent data source
    const result = this.smartTagToggle(start, end, startTag, endTag, selectedText, textareaContent);
    
    // 直接更新 textarea 和组件属性
    textarea.value = result.newContent;
    this.editorContent = result.newContent;

    // 立即设置新的光标位置
    textarea.setSelectionRange(result.newCursorPos, result.newCursorPos);
    textarea.focus();

    // Mark as having changes and update UI
    this.state.hasChanges = true;
    this.state.saveError = null;
    this.updatePreview();

    // Trigger auto-save
    this.contentChangeSubject.next(this.editorContent);
  }

  /**
   * Smart tag toggle - detects existing tags and toggles them
   */
  private smartTagToggle(start: number, end: number, startTag: string, endTag: string, selectedText: string, textareaContent: string): 
    { newContent: string, newCursorPos: number } {
    
    const beforeCursor = textareaContent.substring(0, start);
    const afterCursor = textareaContent.substring(end);

    // Strategy 1: Check if selection includes the tags themselves
    if (selectedText.startsWith(startTag) && selectedText.endsWith(endTag)) {
      // User selected text including tags, remove the tags
      const innerText = selectedText.substring(startTag.length, selectedText.length - endTag.length);
      const newContent = beforeCursor + innerText + afterCursor;
      return {
        newContent,
        newCursorPos: start + innerText.length
      };
    }

    // Strategy 2: Check if selection is immediately surrounded by tags
    const startTagLength = startTag.length;
    const endTagLength = endTag.length;
    
    const beforeTagStart = Math.max(0, start - startTagLength);
    const afterTagEnd = Math.min(this.editorContent.length, end + endTagLength);
    
    const possibleStartTag = this.editorContent.substring(beforeTagStart, start);
    const possibleEndTag = this.editorContent.substring(end, afterTagEnd);

    if (possibleStartTag === startTag && possibleEndTag === endTag) {
      // Remove existing tags that immediately surround the selection
      const newContent = this.editorContent.substring(0, beforeTagStart) + 
                        selectedText + 
                        this.editorContent.substring(afterTagEnd);
      
      return {
        newContent,
        newCursorPos: beforeTagStart + selectedText.length
      };
    }

    // Strategy 3: Check if we're inside existing tags (broader search)
    const surroundingTags = this.findSurroundingTags(start, end, startTag, endTag, textareaContent);
    if (surroundingTags) {
      // Remove the surrounding tags
      const newContent = textareaContent.substring(0, surroundingTags.startTagStart) + 
                        surroundingTags.innerContent + 
                        textareaContent.substring(surroundingTags.endTagEnd);
      
      return {
        newContent,
        newCursorPos: surroundingTags.startTagStart + surroundingTags.innerContent.length
      };
    }

    // Strategy 4: Add new tags
    let wrappedText: string;
    let newCursorPos: number;

    if (selectedText) {
      // Wrap selected text - place cursor after the wrapped content
      wrappedText = `${startTag}${selectedText}${endTag}`;
      newCursorPos = start + startTag.length + selectedText.length + endTag.length;
    } else {
      // Insert tag pair with cursor in the middle for typing
      wrappedText = `${startTag}${endTag}`;
      newCursorPos = start + startTag.length;
    }

    const newContent = beforeCursor + wrappedText + afterCursor;
    
    return { newContent, newCursorPos };
  }

  /**
   * Find surrounding tags around the current selection
   */
  private findSurroundingTags(start: number, end: number, startTag: string, endTag: string, textareaContent: string): 
    { startTagStart: number, startTagEnd: number, endTagStart: number, endTagEnd: number, innerContent: string } | null {
    
    const searchRadius = 200; // Search within 200 characters
    const searchStart = Math.max(0, start - searchRadius);
    const searchEnd = Math.min(textareaContent.length, end + searchRadius);
    const searchArea = textareaContent.substring(searchStart, searchEnd);
    
    // Find the last occurrence of startTag before cursor
    const relativeStart = start - searchStart;
    const relativeEnd = end - searchStart;
    
    let lastStartTag = -1;
    let pos = 0;
    while ((pos = searchArea.indexOf(startTag, pos)) !== -1 && pos < relativeStart) {
      lastStartTag = pos;
      pos += startTag.length;
    }
    
    if (lastStartTag === -1) return null;
    
    // Find the first occurrence of endTag after cursor
    const firstEndTag = searchArea.indexOf(endTag, relativeEnd);
    if (firstEndTag === -1) return null;
    
    // Validate that these tags actually surround our selection
    const startTagEnd = lastStartTag + startTag.length;
    if (startTagEnd <= relativeStart && firstEndTag >= relativeEnd) {
      return {
        startTagStart: searchStart + lastStartTag,
        startTagEnd: searchStart + startTagEnd,
        endTagStart: searchStart + firstEndTag,
        endTagEnd: searchStart + firstEndTag + endTag.length,
        innerContent: searchArea.substring(startTagEnd, firstEndTag)
      };
    }
    
    return null;
  }

  /**
   * Insert a link with prompt for URL
   */
  insertLink(): void {
    const textarea = this.htmlSourceEditor.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.editorContent.substring(start, end);

    const url = prompt('Enter URL:', 'https://');
    if (url === null) return; // User cancelled

    const linkText = selectedText || 'Link text';
    const linkHtml = `<a href="${url}" target="_blank">${linkText}</a>`;

    this.editorContent = this.editorContent.substring(0, start) + 
                        linkHtml + 
                        this.editorContent.substring(end);

    this.onEditorContentChange();

    // Focus and position cursor
    setTimeout(() => {
      textarea.focus();
      const newPos = start + linkHtml.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);

    this.notificationService.success('Link inserted');
  }

  /**
   * Insert a new paragraph
   */
  insertParagraph(): void {
    const textarea = this.htmlSourceEditor.nativeElement;
    const cursorPos = textarea.selectionStart;
    
    const paragraphHtml = '<p></p>';
    this.editorContent = this.editorContent.substring(0, cursorPos) + 
                        paragraphHtml + 
                        this.editorContent.substring(cursorPos);

    this.onEditorContentChange();

    // Position cursor inside the paragraph tags
    setTimeout(() => {
      textarea.focus();
      const newPos = cursorPos + 3; // Position after <p>
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }

  /**
   * Insert a heading with selection for level
   */
  insertHeading(): void {
    const level = prompt('Enter heading level (1-6):', '2');
    if (level === null) return;

    const headingLevel = parseInt(level, 10);
    if (isNaN(headingLevel) || headingLevel < 1 || headingLevel > 6) {
      this.notificationService.warning('Please enter a number between 1 and 6');
      return;
    }

    const textarea = this.htmlSourceEditor.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.editorContent.substring(start, end);

    const headingText = selectedText || 'Heading text';
    const headingHtml = `<h${headingLevel}>${headingText}</h${headingLevel}>`;

    this.editorContent = this.editorContent.substring(0, start) + 
                        headingHtml + 
                        this.editorContent.substring(end);

    this.onEditorContentChange();

    setTimeout(() => {
      textarea.focus();
      const newPos = start + headingHtml.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);

    this.notificationService.success(`H${headingLevel} heading inserted`);
  }

  // Undo/Redo System Integration


  /**
   * Perform undo operation
   */
  performUndo(): void {
    const previousState = this.undoRedoManager.undo();
    if (previousState) {
      this.isUndoRedoOperation = true;
      this.editorContent = previousState.content;
      this.onEditorContentChange();
      this.isUndoRedoOperation = false;

      // Restore selection
      setTimeout(() => {
        if (this.htmlSourceEditor?.nativeElement) {
          const textarea = this.htmlSourceEditor.nativeElement;
          textarea.focus();
          textarea.setSelectionRange(previousState.selection.start, previousState.selection.end);
        }
      }, 0);

      this.notificationService.info(`Undid: ${previousState.description}`);
    } else {
      this.notificationService.warning('Nothing to undo');
    }
  }

  /**
   * Perform redo operation
   */
  performRedo(): void {
    const nextState = this.undoRedoManager.redo();
    if (nextState) {
      this.isUndoRedoOperation = true;
      this.editorContent = nextState.content;
      this.onEditorContentChange();
      this.isUndoRedoOperation = false;

      // Restore selection
      setTimeout(() => {
        if (this.htmlSourceEditor?.nativeElement) {
          const textarea = this.htmlSourceEditor.nativeElement;
          textarea.focus();
          textarea.setSelectionRange(nextState.selection.start, nextState.selection.end);
        }
      }, 0);

      this.notificationService.info(`Redid: ${nextState.description}`);
    } else {
      this.notificationService.warning('Nothing to redo');
    }
  }

  /**
   * Get undo/redo status for UI
   */
  getUndoRedoStatus(): { canUndo: boolean, canRedo: boolean, historySize: number } {
    return this.undoRedoManager.getHistoryInfo();
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoRedoManager.canUndo();
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.undoRedoManager.canRedo();
  }

  /**
   * Initialize undo state when FAQ is loaded
   */
  private initializeUndoState(): void {
    if (this.editorContent && this.htmlSourceEditor?.nativeElement) {
      const textarea = this.htmlSourceEditor.nativeElement;
      const selection = {
        start: textarea.selectionStart || 0,
        end: textarea.selectionEnd || 0
      };
      // Wait a bit for the content to be fully set in the textarea
      setTimeout(() => {
        this.undoRedoManager.saveState(this.editorContent, selection, 'Initial state');
      }, 100);
    }
  }

  /**
   * Clear undo history (call when switching FAQs)
   */
  private clearUndoHistory(): void {
    this.undoRedoManager.clear();
  }
}