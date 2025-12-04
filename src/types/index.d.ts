// ============================================================================
// ChatGPT Exporter - Type Definitions
// Based on data-model.md specifications
// ============================================================================

// ============================================================================
// Content Block Types (Union Type with discriminator)
// ============================================================================

export interface TextBlock {
  type: 'text';
  content: string;
  hasLatex: boolean;
  latexExpressions: LatexExpression[];
}

export interface CodeBlock {
  type: 'code';
  language: string | null;
  content: string;
  filename: string | null;
}

export interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface ImageBlock {
  type: 'image';
  src: string;
  alt: string;
  isGenerated: boolean;
}

export interface ThinkingBlock {
  type: 'thinking';
  content: string;
  isCollapsed: boolean;
}

export type ContentBlock = TextBlock | CodeBlock | TableBlock | ImageBlock | ThinkingBlock;

// ============================================================================
// LaTeX Expression
// ============================================================================

export interface LatexExpression {
  raw: string;
  isBlock: boolean;
  position: number;
}

// ============================================================================
// Message & Conversation
// ============================================================================

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  index: number;
  role: MessageRole;
  content: ContentBlock[];
  rawHtml: string;
  timestamp: Date | null;
  isSelected: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  url: string;
  createdAt: Date | null;
  messages: Message[];
  messageCount: number;
}

// ============================================================================
// Export Configuration
// ============================================================================

export type ExportFormat = 'pdf' | 'markdown' | 'text' | 'json' | 'csv' | 'image';
export type PageSize = 'a4' | 'letter' | 'legal';
export type PageOrientation = 'portrait' | 'landscape';
export type PageMargin = 'normal' | 'narrow' | 'wide';
export type TimeFormat = '12h' | '24h';

export interface ExportConfig {
  // Format
  format: ExportFormat;
  filename: string;
  contentTitle: string;

  // PDF Settings
  pageSize: PageSize;
  orientation: PageOrientation;
  margin: PageMargin;
  darkMode: boolean;
  fontSize: number;
  fontFamily: string;

  // Content Options
  includeUserInfo: boolean;
  userName: string;
  userEmail: string;
  showDateTime: boolean;
  dateFormat: string;
  timeFormat: TimeFormat;

  // Layout Options
  showPageNumbers: boolean;
  showIcons: boolean;
  includeTableOfContents: boolean;
  pageBreakPerPrompt: boolean;

  // Misc
  showDonationPrompt: boolean;
}

// ============================================================================
// Export Job
// ============================================================================

export type ExportStatus =
  | 'pending'
  | 'extracting'
  | 'rendering'
  | 'generating'
  | 'completed'
  | 'failed';

export interface ExportJob {
  id: string;
  conversationId: string;
  format: ExportFormat;
  config: ExportConfig;
  selectedMessageIds: string[];
  status: ExportStatus;
  progress: number;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

// ============================================================================
// Selection State (Transient UI State)
// ============================================================================

export type SelectionMode = 'all' | 'questions' | 'answers' | 'none' | 'custom';

export interface SelectionState {
  mode: SelectionMode;
  selectedIds: Set<string>;
  conversationId: string;
}

// ============================================================================
// Storage Schema
// ============================================================================

export interface StorageSchema {
  exportConfig: ExportConfig;
  lastExportFormat: ExportFormat;
  donationPromptDismissed: boolean;
  donationPromptLastShown: number;
  selectorVersion: string;
  lastSuccessfulExtraction: number;
}

export interface SessionSchema {
  currentExportJob: ExportJob | null;
}

// ============================================================================
// Error Codes
// ============================================================================

export type ExportErrorCode =
  | 'DOM_EXTRACTION_FAILED'
  | 'NO_MESSAGES_SELECTED'
  | 'MESSAGE_LIMIT_EXCEEDED'
  | 'PDF_GENERATION_FAILED'
  | 'STORAGE_ERROR'
  | 'UNKNOWN_FORMAT'
  | 'MEMORY_EXCEEDED';

