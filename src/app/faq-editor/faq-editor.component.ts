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

interface DOMSelection {
  startPath: number[];
  startOffset: number;
  endPath: number[];
  endOffset: number;
  isCollapsed: boolean;
  textOffset?: number; // Fallback: absolute text offset
}

interface EditHistory {
  content: string;
  selection: DOMSelection;
  timestamp: number;
  description: string;
  operationType: 'user' | 'system' | 'format' | 'paste';
  contentHash: string; // For detecting duplicate states
}

class UndoRedoManager {
  private history: EditHistory[] = [];
  private currentIndex = -1;
  private readonly maxHistory = 50;
  private lastSaveTime = 0;
  private readonly minSaveInterval = 500; // Minimum 500ms between saves
  private editorElement: HTMLElement | null = null;

  setEditorElement(element: HTMLElement): void {
    this.editorElement = element;
  }

  private generateContentHash(content: string): string {
    // Simple hash function for content comparison
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private getCurrentDOMSelection(): DOMSelection {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !this.editorElement) {
      return {
        startPath: [],
        startOffset: 0,
        endPath: [],
        endOffset: 0,
        isCollapsed: true,
        textOffset: 0
      };
    }

    const range = selection.getRangeAt(0);
    const startPath = this.getNodePath(range.startContainer);
    const endPath = this.getNodePath(range.endContainer);
    
    // Calculate text offset as fallback
    const textOffset = this.calculateTextOffset(range.startContainer, range.startOffset);
    
    return {
      startPath,
      startOffset: range.startOffset,
      endPath,
      endOffset: range.endOffset,
      isCollapsed: range.collapsed,
      textOffset
    };
  }

  private getNodePath(node: Node): number[] {
    if (!this.editorElement) return [];
    
    const path: number[] = [];
    let current: Node | null = node;
    
    // Walk up the tree until we reach the editor element
    while (current && current !== this.editorElement) {
      const parent: Node | null = current.parentNode;
      if (parent) {
        const index = Array.from(parent.childNodes).indexOf(current as ChildNode);
        if (index !== -1) {
          path.unshift(index);
        }
      }
      current = parent;
    }
    
    return path;
  }

  private calculateTextOffset(node: Node, offset: number): number {
    if (!this.editorElement) return 0;
    
    let totalOffset = 0;
    const walker = document.createTreeWalker(
      this.editorElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentNode;
    while (currentNode = walker.nextNode()) {
      if (currentNode === node) {
        return totalOffset + offset;
      }
      totalOffset += currentNode.textContent?.length || 0;
    }
    
    return totalOffset;
  }

  private restoreDOMSelection(selection: DOMSelection): void {
    if (!this.editorElement) {
      return;
    }
    
    try {
      const windowSelection = window.getSelection();
      if (!windowSelection) {
        return;
      }

      // Try to find nodes by path
      const startNode = this.getNodeByPath(selection.startPath);
      const endNode = this.getNodeByPath(selection.endPath);
      
      if (startNode && endNode) {
        // Successfully found nodes by path
        const range = document.createRange();
        
        // Validate offsets
        const maxStartOffset = this.getMaxOffset(startNode);
        const maxEndOffset = this.getMaxOffset(endNode);
        const safeStartOffset = Math.min(selection.startOffset, maxStartOffset);
        const safeEndOffset = Math.min(selection.endOffset, maxEndOffset);
        
        range.setStart(startNode, safeStartOffset);
        range.setEnd(endNode, safeEndOffset);
        
        windowSelection.removeAllRanges();
        windowSelection.addRange(range);
      } else if (selection.textOffset !== undefined) {
        // Fallback: use text offset
        this.restoreByTextOffset(selection.textOffset);
      } else {
        // Last resort: place at end
        this.placeCursorAtEnd();
      }
    } catch (error) {
      console.warn('Could not restore DOM selection:', error);
      // Try text offset as fallback
      if (selection.textOffset !== undefined) {
        this.restoreByTextOffset(selection.textOffset);
      }
    }
  }

  private getNodeByPath(path: number[]): Node | null {
    if (!this.editorElement || path.length === 0) {
      return this.editorElement;
    }
    
    let current: Node = this.editorElement;
    for (const index of path) {
      if (current.childNodes && index < current.childNodes.length) {
        current = current.childNodes[index];
      } else {
        return null; // Path no longer valid
      }
    }
    
    return current;
  }

  private restoreByTextOffset(textOffset: number): void {
    if (!this.editorElement) return;
    
    try {
      const walker = document.createTreeWalker(
        this.editorElement,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let currentOffset = 0;
      let currentNode;
      
      while (currentNode = walker.nextNode()) {
        const nodeLength = currentNode.textContent?.length || 0;
        if (currentOffset + nodeLength >= textOffset) {
          // Found the target node
          const relativeOffset = Math.min(textOffset - currentOffset, nodeLength);
          
          const selection = window.getSelection();
          const range = document.createRange();
          range.setStart(currentNode, relativeOffset);
          range.collapse(true);
          
          selection?.removeAllRanges();
          selection?.addRange(range);
          return;
        }
        currentOffset += nodeLength;
      }
      
      // If we couldn't find the exact position, place at end
      this.placeCursorAtEnd();
    } catch (error) {
      console.warn('Could not restore by text offset:', error);
      this.placeCursorAtEnd();
    }
  }

  private getMaxOffset(node: Node): number {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.length || 0;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      return node.childNodes.length;
    }
    return 0;
  }


  private placeCursorAtEnd(): void {
    if (!this.editorElement) return;
    
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(this.editorElement);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } catch (error) {
      console.warn('Could not place cursor at end:', error);
    }
  }

  saveState(
    content: string, 
    description: string = 'Edit', 
    operationType: EditHistory['operationType'] = 'user',
    forceNewState = false
  ): boolean {
    const now = Date.now();
    
    // Rate limiting: don't save too frequently unless forced
    if (!forceNewState && (now - this.lastSaveTime) < this.minSaveInterval) {
      return false;
    }
    
    const contentHash = this.generateContentHash(content);
    const selection = this.getCurrentDOMSelection();
    
    // Don't save duplicate states (same content and operation type)
    const lastState = this.getCurrentState();
    if (!forceNewState && lastState && 
        lastState.contentHash === contentHash && 
        lastState.operationType === operationType) {
      return false;
    }
    
    // Remove any redo history when new change is made
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new state
    this.history.push({
      content,
      selection,
      timestamp: now,
      description,
      operationType,
      contentHash
    });

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
    
    this.lastSaveTime = now;
    return true;
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
      const state = this.history[this.currentIndex];
      // Don't restore selection here - let caller handle it after DOM update
      return state;
    }
    return null;
  }

  redo(): EditHistory | null {
    if (this.canRedo()) {
      this.currentIndex++;
      const state = this.history[this.currentIndex];
      // Don't restore selection here - let caller handle it after DOM update
      return state;
    }
    return null;
  }

  // New method to restore selection manually
  restoreSelection(state: EditHistory): void {
    this.restoreDOMSelection(state.selection);
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.lastSaveTime = 0;
  }

  getCurrentState(): EditHistory | null {
    return this.currentIndex >= 0 ? this.history[this.currentIndex] : null;
  }

  getHistoryInfo(): { 
    canUndo: boolean, 
    canRedo: boolean, 
    historySize: number,
    currentIndex: number,
    recentOperations: string[]
  } {
    const recentOps = this.history
      .slice(Math.max(0, this.currentIndex - 2), this.currentIndex + 1)
      .map(h => h.description);
      
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      historySize: this.history.length,
      currentIndex: this.currentIndex,
      recentOperations: recentOps
    };
  }

  // Debug method to inspect history
  getFullHistory(): EditHistory[] {
    return [...this.history];
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
    // Initialize undo manager with the editor element
    if (this.htmlSourceEditor?.nativeElement) {
      this.undoRedoManager.setEditorElement(this.htmlSourceEditor.nativeElement);
    }
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
      // For WYSIWYG editor, set HTML content directly to DOM
      this.editorContent = edited.answer;
      this.currentQuestion = edited.question;
      this.currentCategory = edited.category;
      
      // Set content directly in DOM after view init
      setTimeout(() => {
        if (this.htmlSourceEditor?.nativeElement) {
          this.htmlSourceEditor.nativeElement.innerHTML = this.editorContent;
        }
      }, 0);
      
      console.log('✅ Edited HTML content set for WYSIWYG editor:', this.editorContent);
      this.state.isLoading = false;
      
      // Initialize undo state
      this.initializeUndoState();
      
      // Update preview
      this.updatePreview();
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
          
          // Set content directly in DOM
          setTimeout(() => {
            if (this.htmlSourceEditor?.nativeElement) {
              this.htmlSourceEditor.nativeElement.innerHTML = editableContent;
            }
          }, 0);
          
          console.log('✅ HTML content set in WYSIWYG editor');
          console.log('📄 Content now in editor:', editableContent);
          this.state.isLoading = false;
          
          // Initialize undo state
          this.initializeUndoState();
          
          // Update preview
          this.updatePreview();
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
    
    // For WYSIWYG editor, get HTML content directly from contenteditable
    const editorElement = this.htmlSourceEditor.nativeElement;
    const htmlContent = editorElement.innerHTML || this.editorContent;
    
    const faqData: Partial<EditedFAQ> = {
      faqId: this.state.selectedFAQ.id,
      question: this.currentQuestion,
      answer: htmlContent,
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
   * Focus the editor and ensure it's ready for editing
   */
  private focusEditor(): void {
    if (this.htmlSourceEditor?.nativeElement) {
      this.htmlSourceEditor.nativeElement.focus();
    }
  }

  /**
   * Get current content from the editor DOM
   */
  private getCurrentEditorContent(): string {
    return this.htmlSourceEditor?.nativeElement?.innerHTML || '';
  }

  /**
   * Set content in the editor DOM (used for fallback scenarios)
   */
  private setEditorContent(content: string): void {
    if (this.htmlSourceEditor?.nativeElement) {
      this.isUndoRedoOperation = true;
      
      // For fallback scenarios, directly set innerHTML
      this.htmlSourceEditor.nativeElement.innerHTML = content;
      this.editorContent = content;
      this.updatePreview();
      
      // Reset flag after a short delay to allow event propagation
      setTimeout(() => {
        this.isUndoRedoOperation = false;
      }, 50);
    }
  }

  /**
   * Handle changes in the WYSIWYG editor
   */
  onEditorContentChange(): void {
    // Skip processing if this is an undo/redo operation
    if (this.isUndoRedoOperation) {
      return;
    }
    
    this.state.hasChanges = true;
    this.state.saveError = null;
    
    // Update preview immediately
    this.updatePreview();
    
    // Native contenteditable handles undo history automatically
    
    // Trigger smart auto-save with debounced content update
    this.debouncedContentUpdate();
  }

  /**
   * Debounced content update to avoid frequent re-renders
   */
  private debouncedContentUpdate(): void {
    // Clear any existing timer
    if (this.smartAutoSaveTimer) {
      clearTimeout(this.smartAutoSaveTimer);
    }
    
    // Update editorContent for auto-save with debouncing
    this.smartAutoSaveTimer = setTimeout(() => {
      const currentContent = this.getCurrentEditorContent();
      this.editorContent = currentContent;
      this.contentChangeSubject.next(currentContent);
    }, 300); // Increased delay for better typing experience
  }

  resetCurrentFAQ(): void {
    if (!this.state.selectedFAQ) return;

    console.log('Resetting current FAQ to original content');
    this.selectFAQ(this.state.selectedFAQ);
    
    // Show notification
    this.notificationService.resetWarning(this.getTruncatedTitle(this.state.selectedFAQ.question));
  }


  /**
   * Update preview using simple sanitization (fallback method)
   */
  private updatePreview(): void {
    // For WYSIWYG editor, use content directly
    const editorElement = this.htmlSourceEditor?.nativeElement;
    const htmlContent = editorElement?.innerHTML || this.editorContent;
    this.previewContent = this.sanitizer.bypassSecurityTrustHtml(htmlContent);
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
   * Prepare content for editing - now using WYSIWYG contenteditable
   */
  private prepareContentForEditing(content: string): string {
    console.log('🔍 Original content received:', content);
    
    // For WYSIWYG editor, just clean up and return HTML directly
    let prepared = content
      // Remove potential security threats
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      // Clean up common browser-generated tags
      .replace(/<span[^>]*>\s*<\/span>/gi, '')
      .replace(/<div[^>]*>\s*<\/div>/gi, '')
      .trim();
    
    console.log('✅ Content prepared for WYSIWYG editing:', prepared);
    return prepared;
  }

  // Utility Functions
  
  /**
   * Escape HTML special characters to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Basic URL validation
   */
  private isValidUrl(url: string): boolean {
    try {
      // Allow relative URLs, absolute URLs, and common protocols
      const urlPattern = /^(https?:\/\/|mailto:|tel:|#|\.?\/)/i;
      return url.length > 0 && (urlPattern.test(url) || url.startsWith('/') || url.startsWith('./') || url.startsWith('../'));
    } catch {
      return false;
    }
  }
  
  /**
   * Sanitize URL to prevent javascript: and other dangerous protocols
   */
  private sanitizeUrl(url: string): string {
    // Remove dangerous protocols
    const dangerousProtocols = /^(javascript|data|vbscript):/i;
    if (dangerousProtocols.test(url)) {
      return '#invalid-url';
    }
    return url;
  }

  // HTML Editor Enhancement Functions

  /**
   * Format HTML content using js-beautify
   */
  formatHTML(): void {
    const currentContent = this.getCurrentEditorContent();
    if (!currentContent.trim()) {
      this.notificationService.warning('No content to format');
      return;
    }

    try {
      let formatted = html_beautify(currentContent, {
        indent_size: 2,
        indent_level: 0,
        wrap_line_length: 100,
        preserve_newlines: true,
        max_preserve_newlines: 2,
        indent_inner_html: false,
        unformatted: ['pre', 'code'],
        extra_liners: ['head', 'body', '/html']
      });
      
      // Remove any leading whitespace to prevent first-line indentation
      formatted = formatted.replace(/^\s+/, '');

      // Use execCommand to make the format operation undoable
      this.focusEditor();
      
      // Select all content
      document.execCommand('selectAll', false);
      
      // Insert the formatted content (this creates an undo point)
      document.execCommand('insertHTML', false, formatted);
      
      this.state.hasChanges = true;
      this.updatePreview();
      this.debouncedContentUpdate();
      
      this.notificationService.success('HTML formatted successfully');
    } catch (error) {
      console.error('HTML formatting error:', error);
      this.notificationService.error('Failed to format HTML');
    }
  }


  /**
   * Wrap selected text with HTML tags using native commands
   */
  wrapSelectedText(startTag: string, endTag: string): void {
    // Focus the editor to ensure execCommand works
    this.focusEditor();

    // Map HTML tags to execCommand commands
    let command = '';
    
    if (startTag === '<strong>' && endTag === '</strong>') {
      command = 'bold';
    } else if (startTag === '<em>' && endTag === '</em>') {
      command = 'italic';
    } else if (startTag === '<u>' && endTag === '</u>') {
      command = 'underline';
    } else if (startTag === '<code>' && endTag === '</code>') {
      // Code formatting requires special handling
      this.toggleCodeFormat();
      return;
    }

    if (command) {
      try {
        // Execute the formatting command (automatically creates undo point)
        document.execCommand(command, false);
        
        // Mark as having changes
        this.state.hasChanges = true;
        this.state.saveError = null;
        
        // Update preview
        this.updatePreview();
        this.debouncedContentUpdate();
      } catch (error) {
        console.error('Formatting error:', error);
      }
    }
  }

  /**
   * Toggle code formatting (special case as execCommand doesn't support it)
   */
  private toggleCodeFormat(): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const selectedText = selection.toString();
      
      if (selectedText) {
        // Escape HTML to prevent code injection
        const escapedText = this.escapeHtml(selectedText);
        const codeHTML = `<code>${escapedText}</code>`;
        
        // Use insertHTML to make it undoable
        document.execCommand('insertHTML', false, codeHTML);
        
        this.state.hasChanges = true;
        this.updatePreview();
        this.debouncedContentUpdate();
      }
    }
  }


  /**
   * Insert a link with prompt for URL
   */
  insertLink(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.notificationService.warning('Please select text to create a link');
      return;
    }

    const selectedText = selection.toString();
    const url = prompt('Enter URL:', 'https://');
    if (url === null) return; // User cancelled
    
    // Validate and sanitize URL
    const trimmedUrl = url.trim();
    if (!trimmedUrl || !this.isValidUrl(trimmedUrl)) {
      this.notificationService.warning('Please enter a valid URL');
      return;
    }
    
    const sanitizedUrl = this.sanitizeUrl(trimmedUrl);
    if (sanitizedUrl === '#invalid-url') {
      this.notificationService.warning('Invalid or dangerous URL detected');
      return;
    }

    try {
      // Escape HTML in link text to prevent XSS
      const linkText = selectedText || 'Link text';
      const escapedLinkText = this.escapeHtml(linkText);
      const escapedUrl = this.escapeHtml(sanitizedUrl);
      const linkHTML = `<a href="${escapedUrl}" target="_blank">${escapedLinkText}</a>`;
      
      // Use insertHTML to make it undoable
      document.execCommand('insertHTML', false, linkHTML);
      
      this.state.hasChanges = true;
      this.updatePreview();
      this.debouncedContentUpdate();
      
      this.notificationService.success('Link inserted');
    } catch (error) {
      console.error('Link insertion error:', error);
      this.notificationService.error('Failed to insert link');
    }
  }

  /**
   * Insert a new paragraph
   */
  insertParagraph(): void {
    try {
      // Use insertHTML to make it undoable
      document.execCommand('insertHTML', false, '<p>&nbsp;</p>');
      
      this.state.hasChanges = true;
      this.updatePreview();
      this.debouncedContentUpdate();
    } catch (error) {
      console.error('Paragraph insertion error:', error);
    }
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

    const selection = window.getSelection();
    if (!selection) return;

    try {
      const selectedText = selection.toString();
      const headingText = selectedText || 'Heading text';
      // Escape HTML to prevent XSS
      const escapedHeadingText = this.escapeHtml(headingText);
      const headingHTML = `<h${headingLevel}>${escapedHeadingText}</h${headingLevel}>`;
      
      // Use insertHTML to make it undoable
      document.execCommand('insertHTML', false, headingHTML);
      
      this.state.hasChanges = true;
      this.updatePreview();
      this.debouncedContentUpdate();
      
      this.notificationService.success(`H${headingLevel} heading inserted`);
    } catch (error) {
      console.error('Heading insertion error:', error);
      this.notificationService.error('Failed to insert heading');
    }
  }

  /**
   * Insert unordered list
   */
  insertUnorderedList(): void {
    this.focusEditor();
    document.execCommand('insertUnorderedList', false);
    this.state.hasChanges = true;
    this.updatePreview();
    this.debouncedContentUpdate();
  }

  /**
   * Insert ordered list
   */
  insertOrderedList(): void {
    this.focusEditor();
    document.execCommand('insertOrderedList', false);
    this.state.hasChanges = true;
    this.updatePreview();
    this.debouncedContentUpdate();
  }

  /**
   * Indent selected content
   */
  indent(): void {
    this.focusEditor();
    document.execCommand('indent', false);
    this.state.hasChanges = true;
    this.updatePreview();
    this.debouncedContentUpdate();
  }

  /**
   * Outdent selected content
   */
  outdent(): void {
    this.focusEditor();
    document.execCommand('outdent', false);
    this.state.hasChanges = true;
    this.updatePreview();
    this.debouncedContentUpdate();
  }

  /**
   * Clear all formatting from selected text
   */
  clearFormatting(): void {
    this.focusEditor();
    document.execCommand('removeFormat', false);
    this.state.hasChanges = true;
    this.updatePreview();
    this.debouncedContentUpdate();
  }

  /**
   * Align text left
   */
  alignLeft(): void {
    this.focusEditor();
    document.execCommand('justifyLeft', false);
    this.state.hasChanges = true;
    this.updatePreview();
    this.debouncedContentUpdate();
  }

  /**
   * Align text center
   */
  alignCenter(): void {
    this.focusEditor();
    document.execCommand('justifyCenter', false);
    this.state.hasChanges = true;
    this.updatePreview();
    this.debouncedContentUpdate();
  }

  /**
   * Align text right
   */
  alignRight(): void {
    this.focusEditor();
    document.execCommand('justifyRight', false);
    this.state.hasChanges = true;
    this.updatePreview();
    this.debouncedContentUpdate();
  }

  /**
   * Insert blockquote
   */
  insertBlockquote(): void {
    this.focusEditor();
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const selectedText = selection.toString() || 'Quote text';
      // Escape HTML to prevent XSS
      const escapedText = this.escapeHtml(selectedText);
      const quoteHTML = `<blockquote>${escapedText}</blockquote>`;
      document.execCommand('insertHTML', false, quoteHTML);
      
      this.state.hasChanges = true;
      this.updatePreview();
      this.debouncedContentUpdate();
    }
  }

  /**
   * Insert horizontal rule
   */
  insertHorizontalRule(): void {
    this.focusEditor();
    document.execCommand('insertHorizontalRule', false);
    this.state.hasChanges = true;
    this.updatePreview();
    this.debouncedContentUpdate();
  }

  /**
   * Insert table with specified rows and columns
   */
  insertTable(): void {
    const rowsInput = prompt('Enter total number of rows (including header):', '3');
    const colsInput = prompt('Enter number of columns:', '3');
    
    if (rowsInput === null || colsInput === null) return;
    
    const totalRows = parseInt(rowsInput, 10);
    const colCount = parseInt(colsInput, 10);
    
    // Validation
    if (isNaN(totalRows) || isNaN(colCount) || totalRows < 1 || colCount < 1) {
      this.notificationService.warning('Please enter valid numbers for rows and columns');
      return;
    }
    
    if (totalRows > 20 || colCount > 10) {
      this.notificationService.warning('Table size too large. Maximum: 20 rows x 10 columns');
      return;
    }
    
    // Build table HTML
    let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 1em 0;">';
    
    // Always include header row for better accessibility
    tableHTML += '<thead><tr>';
    for (let c = 0; c < colCount; c++) {
      const escapedHeader = this.escapeHtml(`Header ${c + 1}`);
      tableHTML += `<th style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5; font-weight: bold;">${escapedHeader}</th>`;
    }
    tableHTML += '</tr></thead>';
    
    // Add data rows (total rows - 1 header row)
    const dataRows = Math.max(0, totalRows - 1);
    if (dataRows > 0) {
      tableHTML += '<tbody>';
      for (let r = 0; r < dataRows; r++) {
        tableHTML += '<tr>';
        for (let c = 0; c < colCount; c++) {
          const cellText = this.escapeHtml(`Cell ${r + 1},${c + 1}`);
          tableHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${cellText}</td>`;
        }
        tableHTML += '</tr>';
      }
      tableHTML += '</tbody>';
    }
    
    tableHTML += '</table>';
    
    this.focusEditor();
    document.execCommand('insertHTML', false, tableHTML);
    
    this.state.hasChanges = true;
    this.updatePreview();
    this.debouncedContentUpdate();
    
    const actualRows = Math.max(1, totalRows); // At least header row
    this.notificationService.success(`${actualRows}x${colCount} table inserted (1 header + ${dataRows} data rows)`);
  }

  // Undo/Redo System Integration


  /**
   * Perform undo operation using native browser undo
   */
  performUndo(): void {
    // Focus the editor first
    this.focusEditor();
    
    // Use native browser undo
    const success = document.execCommand('undo', false);
    
    if (success) {
      // Update content from DOM after undo
      this.editorContent = this.getCurrentEditorContent();
      this.state.hasChanges = true;
      this.updatePreview();
      this.debouncedContentUpdate();
    } else {
      // Fallback to custom undo manager if native fails
      const previousState = this.undoRedoManager.undo();
      if (previousState) {
        // Set content without triggering change events
        this.setEditorContent(previousState.content);
        
        // Restore cursor position after DOM is updated
        setTimeout(() => {
          this.undoRedoManager.restoreSelection(previousState);
          this.focusEditor();
        }, 20);
      } else {
        this.notificationService.warning('Nothing to undo');
      }
    }
  }

  /**
   * Perform redo operation using native browser redo
   */
  performRedo(): void {
    // Focus the editor first
    this.focusEditor();
    
    // Use native browser redo
    const success = document.execCommand('redo', false);
    
    if (success) {
      // Update content from DOM after redo
      this.editorContent = this.getCurrentEditorContent();
      this.state.hasChanges = true;
      this.updatePreview();
      this.debouncedContentUpdate();
    } else {
      // Fallback to custom undo manager if native fails
      const nextState = this.undoRedoManager.redo();
      if (nextState) {
        // Set content without triggering change events
        this.setEditorContent(nextState.content);
        
        // Restore cursor position after DOM is updated
        setTimeout(() => {
          this.undoRedoManager.restoreSelection(nextState);
          this.focusEditor();
        }, 20);
      } else {
        this.notificationService.warning('Nothing to redo');
      }
    }
  }

  /**
   * Get undo/redo status for UI
   */
  getUndoRedoStatus(): { canUndo: boolean, canRedo: boolean, historySize: number } {
    return this.undoRedoManager.getHistoryInfo();
  }

  /**
   * Check if undo is available (always true with contenteditable)
   */
  canUndo(): boolean {
    // With native contenteditable, undo is usually available
    // We can't reliably check the native undo stack
    return true;
  }

  /**
   * Check if redo is available (always true with contenteditable)
   */
  canRedo(): boolean {
    // With native contenteditable, redo might be available
    // We can't reliably check the native redo stack
    return true;
  }

  /**
   * Initialize undo state when FAQ is loaded
   */
  private initializeUndoState(): void {
    // Native contenteditable handles its own undo history
    // We only need to clear any previous custom history
    this.undoRedoManager.clear();
  }

  /**
   * Clear undo history (call when switching FAQs)
   */
  private clearUndoHistory(): void {
    // Native contenteditable will reset its own history when content changes
    // Clear our fallback manager just in case
    this.undoRedoManager.clear();
  }
}