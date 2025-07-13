import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-loading',
  template: `
    <div class="loading-container" [class.fullscreen]="fullscreen">
      <div class="loading-content">
        <!-- Skeleton Loading -->
        <ng-container *ngIf="type === 'skeleton'">
          <ng-content></ng-content>
        </ng-container>

        <!-- Spinner Loading -->
        <div class="spinner-container" *ngIf="type === 'spinner'">
          <div class="spinner"></div>
          <p class="loading-text" *ngIf="message">{{ message }}</p>
        </div>

        <!-- Dots Loading -->
        <div class="dots-container" *ngIf="type === 'dots'">
          <div class="dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
          <p class="loading-text" *ngIf="message">{{ message }}</p>
        </div>

        <!-- Pulse Loading -->
        <div class="pulse-container" *ngIf="type === 'pulse'">
          <div class="pulse"></div>
          <p class="loading-text" *ngIf="message">{{ message }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .loading-container.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      z-index: 9999;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .loading-text {
      margin: 0;
      color: #666;
      font-size: 0.875rem;
      text-align: center;
    }

    /* Spinner */
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #1a73e8;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Dots */
    .dots {
      display: flex;
      gap: 4px;
    }

    .dot {
      width: 8px;
      height: 8px;
      background: #1a73e8;
      border-radius: 50%;
      animation: dots-bounce 1.4s ease-in-out infinite both;
    }

    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes dots-bounce {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }

    /* Pulse */
    .pulse {
      width: 40px;
      height: 40px;
      background: #1a73e8;
      border-radius: 50%;
      animation: pulse-scale 1s ease-in-out infinite;
    }

    @keyframes pulse-scale {
      0% {
        transform: scale(0);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 0;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingComponent {
  @Input() type: 'skeleton' | 'spinner' | 'dots' | 'pulse' = 'spinner';
  @Input() message?: string;
  @Input() fullscreen: boolean = false;
}