import { Directive, ElementRef, Renderer2, HostListener, AfterViewInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appZoomable]'
})
export class ZoomableDirective implements AfterViewInit, OnDestroy {
  private backdropEl?: HTMLElement;
  private zoomed = false;
  private clickListener?: (event: Event) => void;
  private currentZoomedImg?: HTMLImageElement;

  constructor(
    private el: ElementRef<HTMLElement>,
    private rd: Renderer2
  ) {}

  ngAfterViewInit(): void {
    this.setupImageClickHandlers();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private setupImageClickHandlers(): void {
    const container = this.el.nativeElement;

    // 使用事件委托处理动态添加的图片
    this.clickListener = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'IMG' && !target.hasAttribute('noZoom')) {
        event.preventDefault();
        event.stopPropagation();
        this.zoomImage(target as HTMLImageElement);
      }
    };

    container.addEventListener('click', this.clickListener, true);

    // 为现有图片添加样式
    this.updateImageStyles();
  }

  private updateImageStyles(): void {
    const images = this.el.nativeElement.querySelectorAll('img:not([noZoom])');
    images.forEach(img => {
      this.rd.setStyle(img, 'cursor', 'zoom-in');
    });
  }

  private zoomImage(img: HTMLImageElement): void {
    if (this.zoomed && this.currentZoomedImg) {
      this.reset(this.currentZoomedImg);
    } else {
      this.zoomIn(img);
    }
  }

  private zoomIn(img: HTMLImageElement): void {
    const rect = img.getBoundingClientRect();

    // 获取图片的原始尺寸
    const originalWidth = img.naturalWidth || rect.width;
    const originalHeight = img.naturalHeight || rect.height;

    // 计算屏幕的可用空间（留出边距）
    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.9;

    // 优先按最大宽度缩放
    const scaleByWidth = maxWidth / originalWidth;
    const scaledHeight = originalHeight * scaleByWidth;

    // 如果按宽度缩放后高度超出，则按高度重新计算
    let finalScale = scaleByWidth;
    if (scaledHeight > maxHeight) {
      finalScale = maxHeight / originalHeight;
    }

    this.backdropEl = this.rd.createElement('div');
    this.rd.addClass(this.backdropEl, 'zoom-backdrop');
    this.rd.setStyle(this.backdropEl, 'pointer-events', 'auto');
    this.backdropEl?.addEventListener('click', () => this.reset(img), { once: true });
    this.rd.appendChild(document.body, this.backdropEl);
    this.rd.setStyle(document.body, 'overflow', 'hidden');

    // 设置图片样式
    this.rd.setStyle(img, 'position', 'fixed');
    this.rd.setStyle(img, 'top', '50%');
    this.rd.setStyle(img, 'left', '50%');
    this.rd.setStyle(img, 'transform-origin', 'center center');
    this.rd.setStyle(img, 'transform', `translate(-50%, -50%) scale(${finalScale})`);
    this.rd.setStyle(img, 'z-index', '10');
    this.rd.setStyle(img, 'cursor', 'zoom-out');
    this.rd.setStyle(img, 'max-width', 'none');
    this.rd.setStyle(img, 'max-height', 'none');

    this.currentZoomedImg = img;
    window.dispatchEvent(new Event('zoomStart'));
    this.zoomed = true;
  }

  private reset(img: HTMLImageElement): void {
    // 直接移除所有样式，不使用动画
    [
      'position', 'top', 'left', 'width', 'height',
      'transform', 'transition', 'z-index', 'max-width', 'max-height'
    ].forEach(s => this.rd.removeStyle(img, s));

    this.rd.setStyle(img, 'cursor', 'zoom-in');

    if (this.backdropEl) {
      this.rd.removeChild(document.body, this.backdropEl);
      this.backdropEl = undefined;
    }
    this.rd.removeStyle(document.body, 'overflow');

    this.currentZoomedImg = undefined;
    window.dispatchEvent(new Event('zoomEnd'));
    this.zoomed = false;
  }

  private cleanup(): void {
    if (this.clickListener) {
      this.el.nativeElement.removeEventListener('click', this.clickListener, true);
    }
    if (this.zoomed && this.currentZoomedImg) {
      this.reset(this.currentZoomedImg);
    }
  }
}
