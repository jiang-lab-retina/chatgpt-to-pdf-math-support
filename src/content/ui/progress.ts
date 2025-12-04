// ============================================================================
// Progress Indicator Component
// Shows export progress with percentage and status
// ============================================================================

let progressOverlay: HTMLDivElement | null = null;

/**
 * Show progress indicator overlay
 */
export function showProgress(progress: number = 0, step: string = 'Starting...'): void {
  if (!progressOverlay) {
    createProgressOverlay();
  }

  updateProgress(progress, step);

  if (progressOverlay && progressOverlay.style.display === 'none') {
    progressOverlay.style.display = 'flex';
  }
}

/**
 * Update progress indicator
 */
export function updateProgress(progress: number, step?: string): void {
  if (!progressOverlay) return;

  const progressFill = progressOverlay.querySelector('.chatgpt-exporter-progress-fill') as HTMLElement;
  const progressText = progressOverlay.querySelector('.chatgpt-exporter-progress-text') as HTMLElement;

  if (progressFill) {
    progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }

  if (progressText && step) {
    progressText.textContent = `${step} (${Math.round(progress)}%)`;
  }
}

/**
 * Hide progress indicator
 */
export function hideProgress(): void {
  if (progressOverlay) {
    progressOverlay.style.display = 'none';
  }
}

/**
 * Create the progress overlay element
 */
function createProgressOverlay(): void {
  progressOverlay = document.createElement('div');
  progressOverlay.className = 'chatgpt-exporter-progress-overlay';
  progressOverlay.innerHTML = `
    <div class="chatgpt-exporter-progress-container">
      <div class="chatgpt-exporter-progress-title">Exporting Conversation</div>
      <div class="chatgpt-exporter-progress-bar">
        <div class="chatgpt-exporter-progress-fill" style="width: 0%"></div>
      </div>
      <div class="chatgpt-exporter-progress-text">Starting... (0%)</div>
    </div>
  `;
  document.body.appendChild(progressOverlay);
}

/**
 * Remove progress overlay from DOM
 */
export function destroyProgress(): void {
  if (progressOverlay) {
    progressOverlay.remove();
    progressOverlay = null;
  }
}

// ============================================================================
// Success/Error Notifications
// ============================================================================

/**
 * Show success notification
 */
export function showSuccess(message: string, duration: number = 3000): void {
  const notification = document.createElement('div');
  notification.className = 'chatgpt-exporter-success';
  notification.innerHTML = `
    <div>${message}</div>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, duration);
}

/**
 * Show error notification
 */
export function showError(title: string, message: string, duration: number = 5000): void {
  const notification = document.createElement('div');
  notification.className = 'chatgpt-exporter-error';
  notification.innerHTML = `
    <button class="chatgpt-exporter-error-close">&times;</button>
    <div class="chatgpt-exporter-error-title">${title}</div>
    <div class="chatgpt-exporter-error-message">${message}</div>
  `;

  const closeBtn = notification.querySelector('.chatgpt-exporter-error-close');
  closeBtn?.addEventListener('click', () => {
    notification.remove();
  });

  document.body.appendChild(notification);

  if (duration > 0) {
    setTimeout(() => {
      notification.remove();
    }, duration);
  }
}

/**
 * Show warning notification
 */
export function showWarning(message: string, duration: number = 4000): void {
  const notification = document.createElement('div');
  notification.className = 'chatgpt-exporter-warning';
  notification.innerHTML = `
    <div>${message}</div>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, duration);
}

