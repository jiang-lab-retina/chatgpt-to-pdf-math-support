// ============================================================================
// ChatGPT DOM Selectors
// Isolated module for easy updates when ChatGPT's DOM structure changes
// ============================================================================

/**
 * DOM selectors for ChatGPT's conversation page.
 * These are isolated in this file to enable quick updates when ChatGPT changes its UI.
 *
 * IMPORTANT: When ChatGPT updates their DOM structure, only this file needs to be updated.
 * The rest of the codebase should use the exported constants and functions.
 */

// ============================================================================
// Conversation Container Selectors
// ============================================================================

export const SELECTORS = {
  // Main conversation container - try multiple approaches
  conversationContainer: 'main',
  conversationContainerFallback: '[role="main"]',

  // Individual message selectors - ChatGPT uses various structures
  // Primary: article elements or data attributes
  messageGroup: 'article, [data-testid^="conversation-turn"], [data-message-author-role]',
  messageGroupFallback: '[class*="group"][class*="w-full"], [class*="conversation-turn"]',

  // User message indicators
  userMessage: '[data-message-author-role="user"]',
  userMessageFallback: '[class*="dark:bg-gray-800"]',

  // Assistant message indicators
  assistantMessage: '[data-message-author-role="assistant"]',
  assistantMessageFallback: '[class*="bg-gray-50"], [class*="agent-turn"]',

  // Message content - the actual text/markdown container
  messageContent: '.markdown, .prose, [class*="markdown"], [class*="prose"]',
  messageContentFallback: '[class*="text-base"], [class*="whitespace-pre-wrap"]',

  // Code blocks
  codeBlock: 'pre code, pre[class*="language-"], [class*="code-block"]',
  codeBlockLanguage: '[class*="language-"]',
  codeBlockCopyButton: 'button[class*="copy"]',

  // Tables
  table: 'table',
  tableHeader: 'thead th',
  tableRow: 'tbody tr',
  tableCell: 'td',

  // Math/LaTeX (KaTeX)
  mathInline: '.katex, [class*="katex"]',
  mathBlock: '.katex-display',

  // Thinking/reasoning blocks
  thinkingBlock: '[data-thinking], [class*="thinking"]',
  thinkingBlockFallback: '[class*="reasoning"]',

  // Page title
  pageTitle: 'title',
  conversationTitle: 'h1, [class*="text-token-text-primary"]',

  // Images
  imageInMessage: '.markdown img, .prose img, img[alt]',
  generatedImage: '[data-generated-image], [class*="dalle"]',

  // Conversation URL pattern - matches chatgpt.com/c/UUID or chatgpt.com/c/alphanumeric
  urlPattern: /^https:\/\/(chat\.openai\.com|chatgpt\.com)\/c\/[a-zA-Z0-9-]+/,
} as const;

// ============================================================================
// Selector Helper Functions
// ============================================================================

/**
 * Try primary selector first, fall back to alternative if not found
 */
export function querySelector(
  container: Element | Document,
  primary: string,
  fallback?: string
): Element | null {
  const result = container.querySelector(primary);
  if (result) return result;

  if (fallback) {
    return container.querySelector(fallback);
  }

  return null;
}

/**
 * Try primary selector first, fall back to alternative if not found
 */
export function querySelectorAll(
  container: Element | Document,
  primary: string,
  fallback?: string
): Element[] {
  const results = Array.from(container.querySelectorAll(primary));
  if (results.length > 0) return results;

  if (fallback) {
    return Array.from(container.querySelectorAll(fallback));
  }

  return [];
}

/**
 * Check if the current page is a ChatGPT conversation page
 */
export function isConversationPage(): boolean {
  return SELECTORS.urlPattern.test(window.location.href);
}

/**
 * Get conversation ID from URL
 */
export function getConversationIdFromUrl(): string | null {
  const match = window.location.href.match(/\/c\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

/**
 * Get conversation title from page
 */
export function getConversationTitle(): string {
  // Try the h1 first (conversation title)
  const h1 = document.querySelector('h1');
  if (h1 && h1.textContent) {
    const text = h1.textContent.trim();
    if (text && text !== 'ChatGPT') {
      return text;
    }
  }

  // Try the page title
  const pageTitle = document.title;
  if (pageTitle) {
    // Remove "ChatGPT" prefix/suffix if present
    return pageTitle
      .replace(/^ChatGPT\s*[-–—|]\s*/i, '')
      .replace(/\s*[-–—|]\s*ChatGPT$/i, '')
      .trim() || 'Untitled Conversation';
  }

  return 'Untitled Conversation';
}

// ============================================================================
// Selector Validation (for graceful degradation)
// ============================================================================

export interface SelectorValidationResult {
  valid: boolean;
  working: string[];
  broken: string[];
}

/**
 * Validate that key selectors are working on the current page
 * Used to detect when ChatGPT has changed their DOM structure
 */
export function validateSelectors(): SelectorValidationResult {
  const working: string[] = [];
  const broken: string[] = [];

  // Check conversation container
  const container = document.querySelector(SELECTORS.conversationContainer) ||
                    document.querySelector(SELECTORS.conversationContainerFallback);
  if (container) {
    working.push('conversationContainer');
  } else {
    broken.push('conversationContainer');
  }

  // Check for message groups - try multiple selector strategies
  const messages = document.querySelectorAll(SELECTORS.messageGroup);
  const messagesFallback = document.querySelectorAll(SELECTORS.messageGroupFallback);
  const articles = document.querySelectorAll('article');
  
  if (messages.length > 0 || messagesFallback.length > 0 || articles.length > 0) {
    working.push('messageGroup');
  } else {
    broken.push('messageGroup');
  }

  // Check for message content
  const content = document.querySelector(SELECTORS.messageContent) ||
                  document.querySelector(SELECTORS.messageContentFallback);
  if (content) {
    working.push('messageContent');
  } else {
    broken.push('messageContent');
  }

  return {
    valid: broken.length === 0,
    working,
    broken,
  };
}

// ============================================================================
// Alternative Extraction Strategy
// ============================================================================

/**
 * Find all elements that look like conversation messages
 * Uses multiple strategies to find messages even if specific selectors fail
 */
export function findAllMessageElements(): Element[] {
  // Strategy 1: article elements (most common)
  let elements = Array.from(document.querySelectorAll('article'));
  if (elements.length > 0) return elements;

  // Strategy 2: data-testid with conversation-turn
  elements = Array.from(document.querySelectorAll('[data-testid^="conversation-turn"]'));
  if (elements.length > 0) return elements;

  // Strategy 3: data-message-author-role
  elements = Array.from(document.querySelectorAll('[data-message-author-role]'));
  if (elements.length > 0) return elements;

  // Strategy 4: Look for the main content area and find grouped message-like divs
  const main = document.querySelector('main');
  if (main) {
    // Look for direct children that might be message containers
    elements = Array.from(main.querySelectorAll(':scope > div > div > div'));
    // Filter to elements that have substantial content
    elements = elements.filter(el => {
      const text = el.textContent || '';
      return text.length > 20; // Has some content
    });
    if (elements.length > 0) return elements;
  }

  // Strategy 5: Generic - look for elements with prose/markdown class
  const contentElements = document.querySelectorAll('.prose, .markdown, [class*="prose"], [class*="markdown"]');
  if (contentElements.length > 0) {
    // Return parent elements of these
    const parents = new Set<Element>();
    contentElements.forEach(el => {
      if (el.parentElement?.parentElement) {
        parents.add(el.parentElement.parentElement);
      }
    });
    return Array.from(parents);
  }

  return [];
}

/**
 * Determine if an element is a user message vs assistant message
 */
export function getMessageRole(element: Element): 'user' | 'assistant' | 'unknown' {
  // Check data attribute
  const roleAttr = element.getAttribute('data-message-author-role');
  if (roleAttr === 'user') return 'user';
  if (roleAttr === 'assistant') return 'assistant';

  // Check nested data attribute
  const nested = element.querySelector('[data-message-author-role]');
  if (nested) {
    const nestedRole = nested.getAttribute('data-message-author-role');
    if (nestedRole === 'user') return 'user';
    if (nestedRole === 'assistant') return 'assistant';
  }

  // Check for user/assistant indicators in class names
  const className = element.className + ' ' + (element.innerHTML || '').substring(0, 500);
  if (className.includes('user') || className.includes('human')) return 'user';
  if (className.includes('assistant') || className.includes('gpt') || className.includes('ai')) return 'assistant';

  // Check for ChatGPT's typical styling patterns
  // User messages typically have different background
  const style = window.getComputedStyle(element);
  const bgColor = style.backgroundColor;
  
  // These are heuristics based on ChatGPT's typical dark theme
  if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
    // This is a rough heuristic - adjust based on actual ChatGPT styling
    return 'unknown';
  }

  return 'unknown';
}

/**
 * Get the content element within a message
 */
export function getMessageContent(element: Element): Element | null {
  // Try various content selectors
  const selectors = [
    '.markdown',
    '.prose',
    '[class*="markdown"]',
    '[class*="prose"]',
    '[class*="text-base"]',
    'div[class*="whitespace"]',
  ];

  for (const selector of selectors) {
    const content = element.querySelector(selector);
    if (content) return content;
  }

  // Fallback: return the element itself if it has text content
  if (element.textContent && element.textContent.trim().length > 0) {
    return element;
  }

  return null;
}
