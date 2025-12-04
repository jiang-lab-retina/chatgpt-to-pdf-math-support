// ============================================================================
// Content Script Entry Point
// Injected into chatgpt.com pages
// ============================================================================

import { isConversationPage, validateSelectors } from './dom/selectors';
import { extractConversation } from './dom/parser';
import { showProgress, hideProgress, updateProgress, showSuccess, showError, showWarning } from './ui/progress';
import { getConfig } from '../shared/storage';
import { executeExport } from './export-handler';
import { MESSAGE_LIMITS } from '../shared/config';

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the content script
 */
async function initialize(): Promise<void> {
  // Only initialize on conversation pages
  if (!isConversationPage()) {
    console.log('ChatGPT Exporter: Not a conversation page, skipping initialization');
    return;
  }

  console.log('ChatGPT Exporter: Initializing on conversation page');

  // Validate that our selectors work with the current DOM structure
  // Note: This is informational - we have fallback strategies
  const selectorValidation = validateSelectors();

  if (!selectorValidation.valid) {
    // This is just a warning - we have multiple fallback strategies
    console.log(
      'ChatGPT Exporter: Using fallback selectors for:',
      selectorValidation.broken.join(', ')
    );
  } else {
    console.log('ChatGPT Exporter: All selectors validated successfully');
  }

  // Wait for DOM to be fully ready
  await waitForConversationContent();

  // Inject toolbar UI
  injectToolbar();
}

/**
 * Wait for conversation content to be loaded in the DOM
 */
function waitForConversationContent(): Promise<void> {
  return new Promise(resolve => {
    // Check if content is already present
    const existingContent = document.querySelector('[data-message-author-role]');
    if (existingContent) {
      resolve();
      return;
    }

    // Otherwise, set up a MutationObserver to wait for content
    const observer = new MutationObserver((_mutations, obs) => {
      const content = document.querySelector('[data-message-author-role]');
      if (content) {
        obs.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Timeout after 10 seconds to prevent infinite wait
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 10000);
  });
}

/**
 * Inject the export toolbar into the page
 */
function injectToolbar(): void {
  // Check if toolbar already exists
  if (document.getElementById('chatgpt-exporter-toolbar')) {
    console.log('ChatGPT Exporter: Toolbar already exists');
    return;
  }

  // Create shadow DOM host for style isolation
  const toolbarHost = document.createElement('div');
  toolbarHost.id = 'chatgpt-exporter-toolbar';
  toolbarHost.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 24px;
    z-index: 10000;
  `;

  const shadowRoot = toolbarHost.attachShadow({ mode: 'open' });

  // Inject styles
  const styles = document.createElement('style');
  styles.textContent = getToolbarStyles();
  shadowRoot.appendChild(styles);

  // Create toolbar container
  const toolbar = document.createElement('div');
  toolbar.className = 'exporter-toolbar';
  toolbar.innerHTML = getToolbarHTML();
  shadowRoot.appendChild(toolbar);

  // Add event listeners
  setupToolbarEventListeners(shadowRoot);

  // Add to page
  document.body.appendChild(toolbarHost);

  console.log('ChatGPT Exporter: Toolbar injected');
}

/**
 * Get toolbar HTML
 */
function getToolbarHTML(): string {
  return `
    <div class="toolbar-container">
      <button class="toolbar-btn export-btn primary" data-action="export" title="Export conversation to PDF">
        <span class="btn-icon">📄</span>
        <span class="btn-text">Export PDF</span>
      </button>
      <button class="toolbar-btn settings-btn" data-action="settings" title="Settings">
        <span class="btn-icon">⚙️</span>
      </button>
    </div>
  `;
}

/**
 * Get toolbar CSS styles
 */
function getToolbarStyles(): string {
  return `
    .toolbar-container {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      background: rgba(32, 33, 35, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      backdrop-filter: blur(8px);
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .toolbar-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .toolbar-btn:active {
      transform: scale(0.98);
    }

    .toolbar-btn.primary {
      background: #10a37f;
      color: #fff;
    }

    .toolbar-btn.primary:hover {
      background: #1a7f64;
    }

    .toolbar-btn .btn-icon {
      font-size: 14px;
    }

    .settings-btn {
      padding: 8px 10px;
      opacity: 0.7;
    }

    .settings-btn:hover {
      opacity: 1;
    }
  `;
}

/**
 * Set up event listeners for toolbar buttons
 */
function setupToolbarEventListeners(shadowRoot: ShadowRoot): void {
  const toolbar = shadowRoot.querySelector('.toolbar-container');
  if (!toolbar) return;

  toolbar.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement | null;

    if (!button) return;

    const action = button.dataset.action;

    switch (action) {
      case 'export':
        void handleExportClick();
        break;
      case 'select':
        handleSelectClick();
        break;
      case 'cancel':
        handleCancelClick();
        break;
      case 'settings':
        handleSettingsClick();
        break;
    }
  });
}

// ============================================================================
// Action Handlers
// ============================================================================

async function handleExportClick(): Promise<void> {
  console.log('ChatGPT Exporter: Export clicked');

  try {
    // Show progress
    showProgress(0, 'Extracting conversation...');

    // Extract conversation from DOM
    const extractionResult = extractConversation();

    if (!extractionResult.success || !extractionResult.data) {
      hideProgress();
      showError('Extraction Failed', extractionResult.error || 'Failed to extract conversation');
      return;
    }

    const conversation = extractionResult.data;

    // Show warnings if any
    if (extractionResult.warnings.length > 0) {
      console.warn('Extraction warnings:', extractionResult.warnings);
    }

    // Check message count
    if (conversation.messageCount > MESSAGE_LIMITS.max) {
      hideProgress();
      showError('Too Many Messages', `This conversation has ${conversation.messageCount} messages. Maximum allowed is ${MESSAGE_LIMITS.max}.`);
      return;
    }

    if (conversation.messageCount > MESSAGE_LIMITS.warning) {
      showWarning(`Large conversation (${conversation.messageCount} messages) - export may take longer`);
    }

    updateProgress(10, 'Loading configuration...');

    // Get export config
    const config = await getConfig();

    // Filter to selected messages (for MVP, select all)
    const selectedMessages = conversation.messages.filter(m => m.isSelected);

    // Execute export directly in content script (required for DOM access)
    const result = await executeExport({
      conversation,
      messages: selectedMessages,
      config,
      onProgress: (progress, step) => {
        updateProgress(progress, step);
      },
    });

    hideProgress();

    if (result.success) {
      showSuccess(`Export complete! Saved as ${result.filename}`);
    } else {
      showError('Export Failed', result.error || 'Unknown error');
    }
  } catch (error) {
    hideProgress();
    console.error('Export error:', error);
    showError('Export Error', error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

function handleSelectClick(): void {
  console.log('ChatGPT Exporter: Select clicked');
  // TODO: Implement in Phase 4 (US2) - T050
  showWarning('Selection feature coming in next update!');
}

function handleCancelClick(): void {
  console.log('ChatGPT Exporter: Cancel clicked');
  hideProgress();
}

function handleSettingsClick(): void {
  console.log('ChatGPT Exporter: Settings clicked');
  // Send message to service worker to open options page
  // window.open() with chrome-extension:// URLs gets blocked
  void chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' });
}

// ============================================================================
// URL Change Detection (for SPA navigation)
// ============================================================================

let lastUrl = window.location.href;

function setupUrlChangeDetection(): void {
  // Use MutationObserver to detect URL changes in SPA
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('ChatGPT Exporter: URL changed to', lastUrl);

      // Re-initialize on navigation
      void initialize();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// ============================================================================
// Entry Point
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initialize();
    setupUrlChangeDetection();
  });
} else {
  void initialize();
  setupUrlChangeDetection();
}
