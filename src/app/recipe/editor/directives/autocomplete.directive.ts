import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  Renderer2,
  NgZone
} from '@angular/core';
import { EDITOR_CONSTANTS } from '../editor.constants';

/**
 * Autocomplete directive for field name suggestions
 * Provides dropdown with keyboard navigation (Arrow keys, Enter, Escape)
 */
@Directive({
  selector: '[appAutocomplete]'
})
export class AutocompleteDirective implements OnDestroy {
  @Input() appAutocomplete: string[] = []; // Field suggestions
  @Output() valueSelected = new EventEmitter<string>();

  private dropdown: HTMLElement | null = null;
  private debounceTimeout: any;
  private closeTimeout: any;
  private listenerCleanupFns: (() => void)[] = []; // Event listener cleanup functions

  constructor(
    private el: ElementRef<HTMLInputElement>,
    private renderer: Renderer2,
    private ngZone: NgZone
  ) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = this.el.nativeElement;

    // Clear existing debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Clear any pending close timeout when user is actively typing
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }

    // Debounce the autocomplete to avoid frequent updates
    this.debounceTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        const query = input.value.toLowerCase();

        if (this.appAutocomplete.length === 0) {
          this.closeDropdown();
          return;
        }

        // Filter fields based on query
        const matches = this.appAutocomplete.filter(field =>
          field.toLowerCase().includes(query) || query.length === 0
        );

        if (matches.length > 0) {
          this.showDropdown(matches);
        } else {
          this.closeDropdown();
        }
      });
    }, EDITOR_CONSTANTS.AUTOCOMPLETE_DEBOUNCE_MS);
  }

  @HostListener('blur', ['$event'])
  onBlur(event: Event): void {
    // Add delay to allow user to click on autocomplete items
    this.closeTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        this.closeDropdown();
      });
    }, EDITOR_CONSTANTS.AUTOCOMPLETE_CLOSE_DELAY_MS);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.dropdown) return;

    this.ngZone.run(() => {
      const items = this.dropdown!.querySelectorAll('.autocomplete-item');
      const selectedItem = this.dropdown!.querySelector('.autocomplete-item.selected');
      let selectedIndex = Array.from(items).indexOf(selectedItem as Element);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (selectedItem) this.renderer.removeClass(selectedItem, 'selected');
          selectedIndex = (selectedIndex + 1) % items.length;
          this.renderer.addClass(items[selectedIndex], 'selected');
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (selectedItem) this.renderer.removeClass(selectedItem, 'selected');
          selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
          this.renderer.addClass(items[selectedIndex], 'selected');
          break;

        case 'Enter':
          event.preventDefault();
          if (selectedItem) {
            const selectedValue = selectedItem.textContent || '';
            this.valueSelected.emit(selectedValue);
            this.closeDropdown();
          }
          break;

        case 'Escape':
          this.closeDropdown();
          break;
      }
    });
  }

  private showDropdown(matches: string[]): void {
    // Remove existing dropdown
    this.closeDropdown();

    const input = this.el.nativeElement;
    const wrapper = input.closest('.autocomplete-wrapper');
    if (!wrapper) return;

    const dropdown = this.renderer.createElement('div');
    this.renderer.addClass(dropdown, 'autocomplete-dropdown');

    matches.forEach((match, index) => {
      const item = this.renderer.createElement('div');
      this.renderer.addClass(item, 'autocomplete-item');
      if (index === 0) this.renderer.addClass(item, 'selected');
      this.renderer.setProperty(item, 'textContent', match);

      // Use mousedown instead of click to fire before blur event
      const cleanup = this.renderer.listen(item, 'mousedown', (event) => {
        event.preventDefault(); // Prevent blur event
        this.ngZone.run(() => {
          this.valueSelected.emit(match);
          this.closeDropdown();
        });
      });
      this.listenerCleanupFns.push(cleanup);

      this.renderer.appendChild(dropdown, item);
    });

    this.renderer.appendChild(wrapper, dropdown);
    this.dropdown = dropdown;
  }

  private closeDropdown(): void {
    const input = this.el.nativeElement;
    const wrapper = input.closest('.autocomplete-wrapper');

    if (wrapper && this.dropdown) {
      this.renderer.removeChild(wrapper, this.dropdown);
      this.dropdown = null;
    }

    // Clean up event listeners
    this.listenerCleanupFns.forEach(cleanup => cleanup());
    this.listenerCleanupFns = [];

    // Clear timeouts
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  }

  ngOnDestroy(): void {
    this.closeDropdown();
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
  }
}
