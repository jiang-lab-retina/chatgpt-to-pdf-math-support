// ============================================================================
// DOM Extraction Types
// Types specific to DOM parsing and extraction operations
// ============================================================================

import type { ContentBlock, Message, Conversation } from '../../types/index.d.ts';

// ============================================================================
// Extraction Results
// ============================================================================

export interface ExtractionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings: string[];
}

export type ConversationExtractionResult = ExtractionResult<Conversation>;
export type MessageExtractionResult = ExtractionResult<Message>;
export type ContentBlockExtractionResult = ExtractionResult<ContentBlock[]>;

// ============================================================================
// Raw DOM Data (intermediate parsing stage)
// ============================================================================

export interface RawMessageElement {
  element: Element;
  role: 'user' | 'assistant' | 'unknown';
  contentElement: Element | null;
  index: number;
}

export interface RawCodeBlock {
  element: Element;
  language: string | null;
  code: string;
  filename: string | null;
}

export interface RawTable {
  element: Element;
  headers: string[];
  rows: string[][];
}

export interface RawMathExpression {
  element: Element;
  latex: string;
  isBlock: boolean;
}

// ============================================================================
// Extraction Options
// ============================================================================

export interface ExtractionOptions {
  /** Include raw HTML in message data (for fallback rendering) */
  includeRawHtml: boolean;

  /** Attempt to extract timestamps from messages */
  extractTimestamps: boolean;

  /** Parse LaTeX expressions */
  parseLaTeX: boolean;

  /** Parse code blocks */
  parseCodeBlocks: boolean;

  /** Parse tables */
  parseTables: boolean;

  /** Include thinking/reasoning blocks */
  includeThinkingBlocks: boolean;

  /** Maximum messages to extract (0 = unlimited) */
  maxMessages: number;
}

export const DEFAULT_EXTRACTION_OPTIONS: ExtractionOptions = {
  includeRawHtml: true,
  extractTimestamps: true,
  parseLaTeX: true,
  parseCodeBlocks: true,
  parseTables: true,
  includeThinkingBlocks: true,
  maxMessages: 0,
};

// ============================================================================
// Selector Failure Tracking
// ============================================================================

export interface SelectorFailure {
  selectorName: string;
  attemptedSelectors: string[];
  timestamp: number;
  pageUrl: string;
}

// ============================================================================
// Element Position Information
// ============================================================================

export interface ElementPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Get the position of an element relative to the document
 */
export function getElementPosition(element: Element): ElementPosition {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

