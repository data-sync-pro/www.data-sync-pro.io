import { Directive, ElementRef, Renderer2, HostListener, AfterViewInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appZoomable]'
})
export class ZoomableDirective implements AfterViewInit, OnDestroy {
  private backdropEl?: HTMLElement;
  private zoomed = false;
  private clickListener?: (event: Event) => void;
  private currentZoomedImg?: HTMLImageElement;
  private mutationObserver?: MutationObserver;

  constructor(
    private el: ElementRef<HTMLElement>,
    private rd: Renderer2
  ) {}

  ngAfterViewInit(): void {
    this.setupImageClickHandlers();
    this.setupMutationObserver();
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

  private setupMutationObserver(): void {
    // 监听DOM变化，为新添加的图片设置样式
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // 检查新添加的元素是否是图片或包含图片
              if (element.tagName === 'IMG') {
                this.styleImage(element as HTMLImageElement);
              } else {
                const images = element.querySelectorAll('img:not([noZoom])');
                images.forEach(img => this.styleImage(img as HTMLImageElement));
              }
            }
          });
        }
      });
    });

    this.mutationObserver.observe(this.el.nativeElement, {
      childList: true,
      subtree: true
    });
  }

  private updateImageStyles(): void {
    const images = this.el.nativeElement.querySelectorAll('img:not([noZoom])');
    images.forEach(img => {
      this.styleImage(img as HTMLImageElement);
    });
  }

  private styleImage(img: HTMLImageElement): void {
    // 避免重复处理
    if (img.hasAttribute('data-zoomable-processed')) {
      return;
    }

    this.rd.setStyle(img, 'cursor', 'zoom-in');
    this.rd.setStyle(img, 'transition', 'transform 0.2s ease');

    // 添加hover效果
    const mouseEnterHandler = () => {
      if (!this.zoomed && !img.hasAttribute('data-zoomed')) {
        this.rd.setStyle(img, 'transform', 'scale(1.02)');
      }
    };

    const mouseLeaveHandler = () => {
      if (!this.zoomed && !img.hasAttribute('data-zoomed')) {
        this.rd.setStyle(img, 'transform', 'scale(1)');
      }
    };

    img.addEventListener('mouseenter', mouseEnterHandler);
    img.addEventListener('mouseleave', mouseLeaveHandler);

    // 标记为已处理
    img.setAttribute('data-zoomable-processed', 'true');

    // 确保图片加载完成后再应用样式
    if (img.complete) {
      this.rd.addClass(img, 'faq-image');
    } else {
      img.addEventListener('load', () => {
        this.rd.addClass(img, 'faq-image');
      }, { once: true });
    }
  }

  private zoomImage(img: HTMLImageElement): void {
    if (this.zoomed && this.currentZoomedImg) {
      this.reset(this.currentZoomedImg);
    } else {
      this.zoomIn(img);
    }
  }

  private zoomIn(img: HTMLImageElement): void {
    // 确保图片已经加载完成
    if (!img.complete || img.naturalWidth === 0) {
      return;
    }

    const rect = img.getBoundingClientRect();

    // 保存原始样式和位置信息
    const originalStyles = {
      position: img.style.position || getComputedStyle(img).position,
      top: img.style.top || getComputedStyle(img).top,
      left: img.style.left || getComputedStyle(img).left,
      transform: img.style.transform || getComputedStyle(img).transform,
      zIndex: img.style.zIndex || getComputedStyle(img).zIndex,
      cursor: img.style.cursor || getComputedStyle(img).cursor,
      maxWidth: img.style.maxWidth || getComputedStyle(img).maxWidth,
      maxHeight: img.style.maxHeight || getComputedStyle(img).maxHeight,
      width: img.style.width || getComputedStyle(img).width,
      height: img.style.height || getComputedStyle(img).height,
      margin: img.style.margin || getComputedStyle(img).margin,
      padding: img.style.padding || getComputedStyle(img).padding,
      border: img.style.border || getComputedStyle(img).border,
      borderRadius: img.style.borderRadius || getComputedStyle(img).borderRadius,
      boxShadow: img.style.boxShadow || getComputedStyle(img).boxShadow
    };

    // 保存原始位置信息
    const originalRect = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    };

    img.setAttribute('data-original-styles', JSON.stringify(originalStyles));
    img.setAttribute('data-original-rect', JSON.stringify(originalRect));

    // 获取图片的原始尺寸
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;

    // 计算屏幕的可用空间（留出边距）
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;

    // 计算缩放比例，确保图片不会超出屏幕
    const scaleByWidth = maxWidth / originalWidth;
    const scaleByHeight = maxHeight / originalHeight;
    let finalScale = Math.min(scaleByWidth, scaleByHeight);

    // 如果图片本身就很小，允许适度放大，但不超过3倍
    if (finalScale > 1) {
      finalScale = Math.min(finalScale, 3);
    }

    // 创建背景遮罩
    this.backdropEl = this.rd.createElement('div');
    this.rd.addClass(this.backdropEl, 'zoom-backdrop');
    this.rd.setStyle(this.backdropEl, 'position', 'fixed');
    this.rd.setStyle(this.backdropEl, 'top', '0');
    this.rd.setStyle(this.backdropEl, 'left', '0');
    this.rd.setStyle(this.backdropEl, 'width', '100%');
    this.rd.setStyle(this.backdropEl, 'height', '100%');
    this.rd.setStyle(this.backdropEl, 'background', 'rgba(0, 0, 0, 0.8)');
    this.rd.setStyle(this.backdropEl, 'z-index', '9999');
    this.rd.setStyle(this.backdropEl, 'display', 'flex');
    this.rd.setStyle(this.backdropEl, 'align-items', 'center');
    this.rd.setStyle(this.backdropEl, 'justify-content', 'center');
    this.rd.setStyle(this.backdropEl, 'cursor', 'zoom-out');

    // 添加点击关闭事件
    this.backdropEl?.addEventListener('click', (e) => {
      if (e.target === this.backdropEl) {
        this.reset(img);
      }
    }, { once: true });

    this.rd.appendChild(document.body, this.backdropEl!);
    this.rd.setStyle(document.body, 'overflow', 'hidden');

    // 重置所有可能影响显示的样式
    this.rd.setStyle(img, 'position', 'fixed');
    this.rd.setStyle(img, 'top', '50%');
    this.rd.setStyle(img, 'left', '50%');
    this.rd.setStyle(img, 'transform-origin', 'center center');
    this.rd.setStyle(img, 'transform', `translate(-50%, -50%) scale(${finalScale})`);
    this.rd.setStyle(img, 'z-index', '10000');
    this.rd.setStyle(img, 'cursor', 'zoom-out');
    this.rd.setStyle(img, 'max-width', 'none');
    this.rd.setStyle(img, 'max-height', 'none');
    this.rd.setStyle(img, 'width', `${originalWidth}px`);
    this.rd.setStyle(img, 'height', `${originalHeight}px`);
    this.rd.setStyle(img, 'margin', '0');
    this.rd.setStyle(img, 'padding', '0');
    this.rd.setStyle(img, 'border', 'none');
    this.rd.setStyle(img, 'border-radius', '8px');
    this.rd.setStyle(img, 'box-shadow', '0 8px 32px rgba(0, 0, 0, 0.3)');
    this.rd.setStyle(img, 'transition', 'transform 0.3s ease');
    this.rd.setStyle(img, 'display', 'block');
    this.rd.setStyle(img, 'visibility', 'visible');
    this.rd.setStyle(img, 'opacity', '1');

    // 标记图片为缩放状态
    img.setAttribute('data-zoomed', 'true');

    this.currentZoomedImg = img;
    window.dispatchEvent(new Event('zoomStart'));
    this.zoomed = true;


  }

  private reset(img: HTMLImageElement): void {

    // 恢复原始样式
    const originalStylesStr = img.getAttribute('data-original-styles');
    if (originalStylesStr) {
      try {
        const originalStyles = JSON.parse(originalStylesStr);

        // 先清除所有可能的缩放样式
        [
          'position', 'top', 'left', 'width', 'height',
          'transform', 'z-index', 'max-width', 'max-height',
          'margin', 'padding', 'border', 'border-radius', 'box-shadow',
          'display', 'visibility', 'opacity'
        ].forEach(prop => this.rd.removeStyle(img, prop));

        // 恢复原始样式
        Object.keys(originalStyles).forEach(key => {
          const value = originalStyles[key];
          if (value && value !== 'auto' && value !== 'none' && value !== '0px') {
            this.rd.setStyle(img, key, value);
          }
        });

        img.removeAttribute('data-original-styles');
        img.removeAttribute('data-original-rect');
      } catch (e) {
        console.error('Failed to restore original styles:', e);
        // 备用方案：移除所有可能的样式
        [
          'position', 'top', 'left', 'width', 'height',
          'transform', 'transition', 'z-index', 'max-width', 'max-height',
          'margin', 'padding', 'border', 'border-radius', 'box-shadow',
          'display', 'visibility', 'opacity'
        ].forEach(s => this.rd.removeStyle(img, s));
      }
    }

    // 移除缩放标记
    img.removeAttribute('data-zoomed');

    // 重新设置基本样式
    this.styleImage(img);

    // 清理背景遮罩
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
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    if (this.zoomed && this.currentZoomedImg) {
      this.reset(this.currentZoomedImg);
    }
  }

  // 添加键盘事件支持
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.zoomed && this.currentZoomedImg) {
      event.preventDefault();
      this.reset(this.currentZoomedImg);
    }
  }
}
