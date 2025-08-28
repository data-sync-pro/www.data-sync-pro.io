import { Directive, ElementRef, Renderer2, HostListener, AfterViewInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appSimpleZoomable]'
})
export class SimpleZoomableDirective implements AfterViewInit, OnDestroy {
  private backdropEl?: HTMLElement;
  private clonedImg?: HTMLImageElement;
  private downloadBtn?: HTMLElement;
  private zoomed = false;
  private clickListener?: (event: Event) => void;
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

    this.clickListener = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'IMG' && !target.hasAttribute('noZoom')) {
        event.preventDefault();
        event.stopPropagation();
        this.zoomImage(target as HTMLImageElement);
      }
    };

    container.addEventListener('click', this.clickListener, true);
    this.updateImageStyles();
  }

  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
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
    if (img.hasAttribute('data-zoomable-processed')) {
      return;
    }
    
    this.rd.setStyle(img, 'cursor', 'zoom-in');
    this.rd.setStyle(img, 'transition', 'transform 0.2s ease');
    
    const mouseEnterHandler = () => {
      if (!this.zoomed) {
        this.rd.setStyle(img, 'transform', 'scale(1.02)');
      }
    };
    
    const mouseLeaveHandler = () => {
      if (!this.zoomed) {
        this.rd.setStyle(img, 'transform', 'scale(1)');
      }
    };
    
    img.addEventListener('mouseenter', mouseEnterHandler);
    img.addEventListener('mouseleave', mouseLeaveHandler);
    img.setAttribute('data-zoomable-processed', 'true');
    
    if (img.complete) {
      this.rd.addClass(img, 'faq-image');
    } else {
      img.addEventListener('load', () => {
        this.rd.addClass(img, 'faq-image');
      }, { once: true });
    }
  }

  private zoomImage(img: HTMLImageElement): void {
    if (this.zoomed) {
      this.closeZoom();
    } else {
      this.openZoom(img);
    }
  }

  private openZoom(img: HTMLImageElement): void {
    if (!img.complete || img.naturalWidth === 0) {
      return;
    }

    // 创建背景遮罩
    this.backdropEl = this.rd.createElement('div');
    this.rd.setStyle(this.backdropEl, 'position', 'fixed');
    this.rd.setStyle(this.backdropEl, 'top', '0');
    this.rd.setStyle(this.backdropEl, 'left', '0');
    this.rd.setStyle(this.backdropEl, 'width', '100vw');
    this.rd.setStyle(this.backdropEl, 'height', '100vh');
    this.rd.setStyle(this.backdropEl, 'background', 'rgba(0, 0, 0, 0.8)');
    this.rd.setStyle(this.backdropEl, 'z-index', '9999');
    this.rd.setStyle(this.backdropEl, 'display', 'flex');
    this.rd.setStyle(this.backdropEl, 'align-items', 'center');
    this.rd.setStyle(this.backdropEl, 'justify-content', 'center');
    this.rd.setStyle(this.backdropEl, 'cursor', 'zoom-out');

    // 创建图片克隆
    this.clonedImg = img.cloneNode(true) as HTMLImageElement;
    
    // 计算最佳尺寸 - 使用95%的屏幕宽度
    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.9;
    const imgRatio = img.naturalWidth / img.naturalHeight;

    let finalWidth: number;
    let finalHeight: number;

    // 优先使用95%的屏幕宽度
    finalWidth = maxWidth;
    finalHeight = finalWidth / imgRatio;

    // 如果高度超出屏幕，则调整为适合屏幕高度
    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = finalHeight * imgRatio;
    }

    // 设置克隆图片样式
    this.rd.setStyle(this.clonedImg, 'width', `${finalWidth}px`);
    this.rd.setStyle(this.clonedImg, 'height', `${finalHeight}px`);
    this.rd.setStyle(this.clonedImg, 'max-width', 'none');
    this.rd.setStyle(this.clonedImg, 'max-height', 'none');
    this.rd.setStyle(this.clonedImg, 'border-radius', '8px');
    this.rd.setStyle(this.clonedImg, 'box-shadow', '0 8px 32px rgba(0, 0, 0, 0.3)');
    this.rd.setStyle(this.clonedImg, 'cursor', 'zoom-out');
    this.rd.setStyle(this.clonedImg, 'user-select', 'none');
    this.rd.setStyle(this.clonedImg, 'pointer-events', 'none');

    // 添加图片到背景
    this.rd.appendChild(this.backdropEl, this.clonedImg);
    
    // 创建下载按钮
    this.downloadBtn = this.rd.createElement('button');
    this.rd.setStyle(this.downloadBtn, 'position', 'fixed');
    this.rd.setStyle(this.downloadBtn, 'top', '20px');
    this.rd.setStyle(this.downloadBtn, 'right', '20px');
    this.rd.setStyle(this.downloadBtn, 'z-index', '10001');
    this.rd.setStyle(this.downloadBtn, 'width', '48px');
    this.rd.setStyle(this.downloadBtn, 'height', '48px');
    this.rd.setStyle(this.downloadBtn, 'border-radius', '50%');
    this.rd.setStyle(this.downloadBtn, 'background', 'rgba(0, 0, 0, 0.6)');
    this.rd.setStyle(this.downloadBtn, 'border', 'none');
    this.rd.setStyle(this.downloadBtn, 'color', 'white');
    this.rd.setStyle(this.downloadBtn, 'cursor', 'pointer');
    this.rd.setStyle(this.downloadBtn, 'display', 'flex');
    this.rd.setStyle(this.downloadBtn, 'align-items', 'center');
    this.rd.setStyle(this.downloadBtn, 'justify-content', 'center');
    this.rd.setStyle(this.downloadBtn, 'transition', 'background 0.3s ease');
    this.rd.setAttribute(this.downloadBtn, 'title', 'Download image');
    
    // 添加下载图标 (使用SVG)
    const iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
    `;
    if (this.downloadBtn) {
      this.downloadBtn.innerHTML = iconSvg;
      
      // 添加悬停效果
      this.downloadBtn.addEventListener('mouseenter', () => {
        if (this.downloadBtn) {
          this.rd.setStyle(this.downloadBtn, 'background', 'rgba(0, 0, 0, 0.8)');
        }
      });
      
      this.downloadBtn.addEventListener('mouseleave', () => {
        if (this.downloadBtn) {
          this.rd.setStyle(this.downloadBtn, 'background', 'rgba(0, 0, 0, 0.6)');
        }
      });
      
      // 添加下载功能
      this.downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.downloadImage(img);
      });
      
      // 添加下载按钮到页面
      this.rd.appendChild(document.body, this.downloadBtn);
    }
    
    // 添加点击事件
    this.backdropEl?.addEventListener('click', () => this.closeZoom(), { once: true });
    
    // 添加到页面
    this.rd.appendChild(document.body, this.backdropEl);
    this.rd.setStyle(document.body, 'overflow', 'hidden');

    this.zoomed = true;
    window.dispatchEvent(new Event('zoomStart'));
  }

  private closeZoom(): void {
    if (this.backdropEl) {
      this.rd.removeChild(document.body, this.backdropEl);
      this.backdropEl = undefined;
    }
    
    if (this.downloadBtn) {
      this.rd.removeChild(document.body, this.downloadBtn);
      this.downloadBtn = undefined;
    }
    
    if (this.clonedImg) {
      this.clonedImg = undefined;
    }
    
    this.rd.removeStyle(document.body, 'overflow');
    this.zoomed = false;
    window.dispatchEvent(new Event('zoomEnd'));
  }
  
  private downloadImage(img: HTMLImageElement): void {
    const link = document.createElement('a');
    link.href = img.src;
    
    // Extract filename from URL or use default
    let filename = 'image.png';
    try {
      const url = new URL(img.src);
      const pathname = url.pathname;
      const lastSlash = pathname.lastIndexOf('/');
      if (lastSlash !== -1) {
        filename = pathname.substring(lastSlash + 1) || 'image.png';
      }
      // Ensure filename has an extension
      if (!filename.includes('.')) {
        filename = filename + '.png';
      }
    } catch (e) {
      // If URL parsing fails, use default filename
      filename = 'image.png';
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private cleanup(): void {
    if (this.clickListener) {
      this.el.nativeElement.removeEventListener('click', this.clickListener, true);
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    if (this.zoomed) {
      this.closeZoom();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.zoomed) {
      event.preventDefault();
      this.closeZoom();
    }
  }
}
