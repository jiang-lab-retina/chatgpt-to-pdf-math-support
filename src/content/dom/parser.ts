// ============================================================================
// ChatGPT DOM Parser
// Extracts conversation data from ChatGPT's DOM structure
// ============================================================================

import type {
  Conversation,
  Message,
  MessageRole,
  ContentBlock,
  TextBlock,
  CodeBlock,
  TableBlock,
  ThinkingBlock,
  LatexExpression,
} from '../../types/index.d.ts';

import type {
  ConversationExtractionResult,
  ExtractionOptions,
} from './types';
import { DEFAULT_EXTRACTION_OPTIONS } from './types';

import {
  SELECTORS,
  getConversationIdFromUrl,
  getConversationTitle,
  isConversationPage,
  findAllMessageElements,
  getMessageRole,
  getMessageContent,
} from './selectors';

// ============================================================================
// Main Extraction Functions
// ============================================================================

/**
 * Extract the full conversation from the current page
 */
export function extractConversation(
  options: Partial<ExtractionOptions> = {}
): ConversationExtractionResult {
  const opts = { ...DEFAULT_EXTRACTION_OPTIONS, ...options };
  const warnings: string[] = [];

  // Validate we're on a conversation page
  if (!isConversationPage()) {
    return {
      success: false,
      error: 'Not on a ChatGPT conversation page',
      warnings,
    };
  }

  // Get conversation ID
  const conversationId = getConversationIdFromUrl();
  if (!conversationId) {
    return {
      success: false,
      error: 'Could not extract conversation ID from URL',
      warnings,
    };
  }

  // Get conversation title
  const title = getConversationTitle();

  // Extract messages
  const messagesResult = extractMessages(opts);

  if (!messagesResult.success || !messagesResult.data) {
    return {
      success: false,
      error: messagesResult.error || 'Failed to extract messages',
      warnings: [...warnings, ...messagesResult.warnings],
    };
  }

  warnings.push(...messagesResult.warnings);

  const conversation: Conversation = {
    id: conversationId,
    title,
    url: window.location.href,
    createdAt: null,
    messages: messagesResult.data,
    messageCount: messagesResult.data.length,
  };

  return {
    success: true,
    data: conversation,
    warnings,
  };
}

// ============================================================================
// Message Extraction
// ============================================================================

interface MessageExtractionResult {
  success: boolean;
  data?: Message[];
  error?: string;
  warnings: string[];
}

/**
 * Extract all messages from the conversation
 */
export function extractMessages(
  options: Partial<ExtractionOptions> = {}
): MessageExtractionResult {
  const opts = { ...DEFAULT_EXTRACTION_OPTIONS, ...options };
  const warnings: string[] = [];

  // Use the robust message finding function
  const messageElements = findAllMessageElements();

  if (messageElements.length === 0) {
    // Try one more fallback - just get all text content from main
    const main = document.querySelector('main');
    if (main) {
      warnings.push('Using fallback extraction - structure may not be ideal');
      
      // Create a simple message from the entire content
      const content = main.textContent || '';
      if (content.trim()) {
        return {
          success: true,
          data: [{
            id: 'fallback-0',
            index: 0,
            role: 'assistant' as MessageRole,
            content: [{ type: 'text', content: content.trim(), hasLatex: false, latexExpressions: [] }],
            rawHtml: main.innerHTML,
            timestamp: null,
            isSelected: true,
          }],
          warnings,
        };
      }
    }

    return {
      success: false,
      error: 'No messages found in conversation. Please make sure the page is fully loaded.',
      warnings,
    };
  }

  // Check message limit
  if (opts.maxMessages > 0 && messageElements.length > opts.maxMessages) {
    warnings.push(`Conversation has ${messageElements.length} messages, limiting to ${opts.maxMessages}`);
  }

  const messages: Message[] = [];
  const elementsToProcess = opts.maxMessages > 0
    ? messageElements.slice(0, opts.maxMessages)
    : messageElements;

  for (let index = 0; index < elementsToProcess.length; index++) {
    const element = elementsToProcess[index];
    try {
      const message = parseMessageElement(element, index, opts);
      if (message) {
        messages.push(message);
      }
    } catch (error) {
      warnings.push(`Failed to parse message at index ${index}: ${error}`);
    }
  }

  if (messages.length === 0) {
    return {
      success: false,
      error: 'Failed to parse any messages',
      warnings,
    };
  }

  return {
    success: true,
    data: messages,
    warnings,
  };
}

// ============================================================================
// Message Parsing
// ============================================================================

/**
 * Parse a raw message element into a Message object
 */
function parseMessageElement(
  element: Element,
  index: number,
  options: ExtractionOptions
): Message | null {
  // Determine role
  const role = getMessageRole(element);
  
  // Get content element
  const contentElement = getMessageContent(element);

  // Extract content blocks
  const content = contentElement
    ? parseContentBlocks(contentElement, options)
    : [];

  // Get raw HTML for fallback
  const rawHtml = contentElement?.innerHTML || element.innerHTML || '';

  // If we couldn't determine role and have no content, skip
  if (role === 'unknown' && content.length === 0 && !rawHtml.trim()) {
    return null;
  }

  // Try to extract message ID
  const messageId = extractMessageId(element) || `msg-${index}`;

  // Default unknown roles based on index (alternating user/assistant is common)
  const finalRole: MessageRole = role === 'unknown' 
    ? (index % 2 === 0 ? 'user' : 'assistant')
    : role;

  return {
    id: messageId,
    index,
    role: finalRole,
    content,
    rawHtml,
    timestamp: null,
    isSelected: true,
  };
}

/**
 * Extract message ID from element
 */
function extractMessageId(element: Element): string | null {
  // Try data-message-id attribute
  const messageIdAttr = element.querySelector('[data-message-id]');
  if (messageIdAttr) {
    return messageIdAttr.getAttribute('data-message-id');
  }

  // Try data-testid
  const testId = element.getAttribute('data-testid');
  if (testId) {
    return testId;
  }

  // Try id attribute
  if (element.id) {
    return element.id;
  }

  return null;
}

// ============================================================================
// Content Block Parsing
// ============================================================================

/**
 * Parse content blocks from a message content element
 * Preserves structure: paragraphs, lists, code blocks, tables
 */
export function parseContentBlocks(
  contentElement: Element,
  options: ExtractionOptions
): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Process all child elements in order to preserve structure
  const children = contentElement.children;
  
  if (children.length === 0) {
    // No child elements - treat entire content as text
    const text = contentElement.textContent?.trim();
    if (text) {
      blocks.push(createTextBlock(text, options));
    }
    return blocks;
  }

  // Process each child element
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const tagName = child.tagName.toLowerCase();

    // Code blocks (pre)
    if (tagName === 'pre' && options.parseCodeBlocks) {
      const block = parseCodeBlock(child);
      if (block) blocks.push(block);
      continue;
    }

    // Tables
    if (tagName === 'table' && options.parseTables) {
      const block = parseTableBlock(child);
      if (block) blocks.push(block);
      continue;
    }

    // Thinking blocks
    if (options.includeThinkingBlocks && isThinkingElement(child)) {
      const block = parseThinkingBlock(child);
      if (block) blocks.push(block);
      continue;
    }

    // Lists (ol, ul) - convert to text with formatting
    if (tagName === 'ol' || tagName === 'ul') {
      const listText = parseListToText(child, tagName === 'ol');
      if (listText) {
        blocks.push(createTextBlock(listText, options));
      }
      continue;
    }

    // Paragraphs and other text content (p, div, h1-h6, span, etc.)
    const text = getElementTextWithStructure(child);
    if (text.trim()) {
      blocks.push(createTextBlock(text, options));
    }
  }

  // If no blocks found, try getting text content directly
  if (blocks.length === 0) {
    const allText = contentElement.textContent?.trim();
    if (allText) {
      blocks.push(createTextBlock(allText, options));
    }
  }

  return blocks;
}

/**
 * Check if element is a thinking/reasoning block
 */
function isThinkingElement(element: Element): boolean {
  return (
    element.matches(SELECTORS.thinkingBlock) ||
    element.getAttribute('data-thinking') !== null ||
    element.className.includes('thinking')
  );
}

/**
 * Parse a list element to formatted text
 * Properly handles math elements within list items
 */
function parseListToText(listElement: Element, isOrdered: boolean): string {
  const items = listElement.querySelectorAll(':scope > li');
  const lines: string[] = [];
  
  items.forEach((item, index) => {
    const prefix = isOrdered ? `${index + 1}. ` : '• ';
    // Use getElementTextWithStructure to properly extract math
    const text = getElementTextWithStructure(item).trim();
    if (text) {
      // Remove extra newlines within list item
      lines.push(prefix + text.replace(/\n+/g, ' '));
    }
  });
  
  return lines.join('\n');
}

/**
 * Get text from element while preserving structure and math
 * Properly extracts LaTeX from ChatGPT's rendered math elements
 */
function getElementTextWithStructure(element: Element): string {
  // Clone to avoid modifying original
  const clone = element.cloneNode(true) as Element;
  
  // Remove strikethrough/deleted text elements (they corrupt formulas)
  clone.querySelectorAll('del, s, strike').forEach(el => {
    // Replace with just the text content, removing the strikethrough
    const text = el.textContent || '';
    el.replaceWith(text);
  });
  
  // Remove any elements with text-decoration: line-through
  clone.querySelectorAll('[style*="line-through"]').forEach(el => {
    const text = el.textContent || '';
    el.replaceWith(text);
  });
  
  // CRITICAL: Handle ChatGPT's math rendering (KaTeX/MathJax)
  // ChatGPT wraps math in .katex elements with original LaTeX in <annotation>
  
  // Handle KaTeX rendered math - extract original LaTeX from annotation
  clone.querySelectorAll('.katex').forEach(katex => {
    const annotation = katex.querySelector('annotation[encoding="application/x-tex"]');
    if (annotation && annotation.textContent) {
      const latex = cleanExtractedLatex(annotation.textContent.trim());
      // Check if it's display/block math (in a .katex-display parent)
      const isBlock = katex.closest('.katex-display') !== null;
      const delimiter = isBlock ? '$$' : '$';
      const replacement = document.createTextNode(`${delimiter}${latex}${delimiter}`);
      katex.replaceWith(replacement);
    }
  });
  
  // Handle MathJax rendered math
  clone.querySelectorAll('mjx-container').forEach(mjx => {
    // MathJax stores original in data-formula or in a child script
    const formula = mjx.getAttribute('data-formula') || 
                    mjx.querySelector('script[type*="math"]')?.textContent;
    if (formula) {
      const latex = cleanExtractedLatex(formula);
      const isBlock = mjx.getAttribute('display') === 'block' || 
                      mjx.classList.contains('MathJax_Display');
      const delimiter = isBlock ? '$$' : '$';
      const replacement = document.createTextNode(`${delimiter}${latex}${delimiter}`);
      mjx.replaceWith(replacement);
    }
  });
  
  // Handle math wrapped in span with specific classes
  clone.querySelectorAll('span.math, span.math-inline, span.math-display').forEach(span => {
    const rawLatex = span.getAttribute('data-latex') || 
                     span.getAttribute('data-value') ||
                     span.querySelector('annotation')?.textContent;
    if (rawLatex) {
      const latex = cleanExtractedLatex(rawLatex);
      const isBlock = span.classList.contains('math-display');
      const delimiter = isBlock ? '$$' : '$';
      const replacement = document.createTextNode(`${delimiter}${latex}${delimiter}`);
      span.replaceWith(replacement);
    }
  });
  
  // Replace <br> with newlines
  clone.querySelectorAll('br').forEach(br => {
    br.replaceWith('\n');
  });
  
  // Add newlines after block elements
  clone.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6').forEach(block => {
    if (block.textContent) {
      block.append('\n');
    }
  });
  
  return clone.textContent || '';
}

/**
 * Clean extracted LaTeX to fix common corruption issues
 */
function cleanExtractedLatex(latex: string): string {
  let cleaned = latex;
  
  // Fix vertical bars used as backslashes: |frac -> \frac
  cleaned = cleaned.replace(/\|(frac|left|right|sqrt|sin|cos|tan|text|Rightarrow|neq|leq|geq|pi)/g, '\\$1');
  
  // Fix angle brackets used as curly braces
  cleaned = cleaned.replace(/\\langle\s*/g, '{');
  cleaned = cleaned.replace(/\s*\\rangle/g, '}');
  
  // Fix \backslash -> \
  cleaned = cleaned.replace(/\\backslash\s*/g, '\\');
  
  // Fix spaced-out commands
  cleaned = cleaned.replace(/\\f\s*r\s*a\s*c/g, '\\frac');
  cleaned = cleaned.replace(/\\s\s*q\s*r\s*t/g, '\\sqrt');
  cleaned = cleaned.replace(/\\t\s*e\s*x\s*t/g, '\\text');
  
  // Fix \{operatorname{...} -> \...
  cleaned = cleaned.replace(/\\\{operatorname\{(frac|sin|cos|tan|log|ln|exp|sqrt)\}\}/g, '\\$1');
  cleaned = cleaned.replace(/\{\\operatorname\{(frac|sin|cos|tan|log|ln|exp|sqrt)\}/g, '\\$1{');
  cleaned = cleaned.replace(/\\operatorname\{(frac|sin|cos|tan|log|ln|exp|sqrt)\}/g, '\\$1');
  
  // Fix \left\{frac -> \left(\frac
  cleaned = cleaned.replace(/\\left\\\{frac/g, '\\left(\\frac');
  cleaned = cleaned.replace(/\\left\{frac/g, '\\left(\\frac');
  
  // Fix broken frac syntax: \frac(a)(b) -> \frac{a}{b}
  cleaned = cleaned.replace(/\\frac\(([^)]+)\)\(([^)]+)\)/g, '\\frac{$1}{$2}');
  
  // Fix \{frac{...}{...}\} -> \frac{...}{...}
  cleaned = cleaned.replace(/\\\{frac\{([^}]+)\}\{([^}]+)\}\}/g, '\\frac{$1}{$2}');
  cleaned = cleaned.replace(/\{frac\{([^}]+)\}\{([^}]+)\}/g, '\\frac{$1}{$2}');
  
  // Fix right patterns
  cleaned = cleaned.replace(/right\\\^(\d)/g, '\\right)^$1');
  cleaned = cleaned.replace(/\}right\^(\d)/g, '\\right)^$1');
  cleaned = cleaned.replace(/\\right\}/g, '\\right)');
  cleaned = cleaned.replace(/\(right\)/g, '\\right)');
  
  // Fix \mathrm{x} -> x for single letters
  cleaned = cleaned.replace(/\\mathrm\{([a-zA-Z])\}/g, '$1');
  
  // Fix ^ written as \wedge or \^
  cleaned = cleaned.replace(/\\wedge/g, '^');
  cleaned = cleaned.replace(/\\\^/g, '^');
  
  // Fix \underline{x} -> x
  cleaned = cleaned.replace(/\\underline\{([^}]+)\}/g, '$1');
  cleaned = cleaned.replace(/\\boldsymbol\{([^}]+)\}/g, '$1');
  
  // Fix \quad spacing
  cleaned = cleaned.replace(/\\quad\s*/g, ' ');
  cleaned = cleaned.replace(/\\qquad\s*/g, '  ');
  
  // Fix double backslashes
  cleaned = cleaned.replace(/\\\\/g, ' ');
  
  return cleaned;
}

/**
 * Get text content excluding code blocks and tables
 */
/**
 * Create a TextBlock, optionally parsing LaTeX
 */
function createTextBlock(text: string, options: ExtractionOptions): TextBlock {
  const latexExpressions: LatexExpression[] = [];
  let hasLatex = false;

  if (options.parseLaTeX) {
    // Find inline LaTeX ($...$)
    const inlineRegex = /\$([^$]+)\$/g;
    let match;
    while ((match = inlineRegex.exec(text)) !== null) {
      hasLatex = true;
      latexExpressions.push({
        raw: match[1],
        isBlock: false,
        position: match.index,
      });
    }

    // Find block LaTeX ($$...$$)
    const blockRegex = /\$\$([^$]+)\$\$/g;
    while ((match = blockRegex.exec(text)) !== null) {
      hasLatex = true;
      latexExpressions.push({
        raw: match[1],
        isBlock: true,
        position: match.index,
      });
    }
  }

  return {
    type: 'text',
    content: text,
    hasLatex,
    latexExpressions,
  };
}

/**
 * Parse a code block element
 */
function parseCodeBlock(element: Element): CodeBlock | null {
  const codeElement = element.querySelector('code') || element;
  const code = codeElement.textContent || '';

  if (!code.trim()) return null;

  // Try to extract language from class
  let language: string | null = null;
  const classList = Array.from(codeElement.classList);
  const langClass = classList.find(c => c.startsWith('language-') || c.startsWith('lang-'));
  if (langClass) {
    language = langClass.replace(/^(language-|lang-)/, '');
  }

  // Try to extract filename if present
  let filename: string | null = null;
  const parent = element.parentElement;
  if (parent) {
    const filenameElement = parent.querySelector('[class*="filename"], [class*="file-name"]');
    if (filenameElement) {
      filename = filenameElement.textContent?.trim() || null;
    }
  }

  return {
    type: 'code',
    language,
    content: code.trim(),
    filename,
  };
}

/**
 * Parse a table element
 */
function parseTableBlock(element: Element): TableBlock {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Extract headers
  const headerCells = element.querySelectorAll('thead th, thead td');
  headerCells.forEach(cell => {
    headers.push(cell.textContent?.trim() || '');
  });

  // If no thead, try first row
  if (headers.length === 0) {
    const firstRow = element.querySelector('tr');
    if (firstRow) {
      firstRow.querySelectorAll('th, td').forEach(cell => {
        headers.push(cell.textContent?.trim() || '');
      });
    }
  }

  // Extract body rows
  const bodyRows = element.querySelectorAll('tbody tr');
  bodyRows.forEach(row => {
    const rowData: string[] = [];
    row.querySelectorAll('td').forEach(cell => {
      rowData.push(cell.textContent?.trim() || '');
    });
    if (rowData.length > 0) {
      rows.push(rowData);
    }
  });

  // If no tbody, get all rows except first (if headers were from first row)
  if (rows.length === 0) {
    const allRows = Array.from(element.querySelectorAll('tr'));
    allRows.slice(1).forEach(row => {
      const rowData: string[] = [];
      row.querySelectorAll('td, th').forEach(cell => {
        rowData.push(cell.textContent?.trim() || '');
      });
      if (rowData.length > 0) {
        rows.push(rowData);
      }
    });
  }

  return {
    type: 'table',
    headers,
    rows,
  };
}

/**
 * Parse a thinking block element
 */
function parseThinkingBlock(element: Element): ThinkingBlock {
  return {
    type: 'thinking',
    content: element.textContent?.trim() || '',
    isCollapsed: element.getAttribute('data-collapsed') === 'true' ||
                 element.classList.contains('collapsed'),
  };
}
