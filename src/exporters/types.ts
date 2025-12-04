// ============================================================================
// Exporter Types
// Common interfaces for all export format implementations
// ============================================================================

import type { Conversation, Message, ExportConfig, ExportFormat } from '../types/index.d.ts';

// ============================================================================
// Export Result
// ============================================================================

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
  mimeType?: string;
  byteSize?: number;
}

// ============================================================================
// Exporter Interface
// ============================================================================

export interface Exporter {
  /**
   * The format this exporter handles
   */
  format: ExportFormat;

  /**
   * Export conversation to the target format
   * @param conversation - The conversation to export
   * @param messages - The messages to include (may be filtered)
   * @param config - Export configuration
   * @param onProgress - Optional progress callback (0-100)
   */
  export(
    conversation: Conversation,
    messages: Message[],
    config: ExportConfig,
    onProgress?: (progress: number) => void
  ): Promise<ExportResult>;

  /**
   * Get the file extension for this format
   */
  getFileExtension(): string;

  /**
   * Get the MIME type for this format
   */
  getMimeType(): string;
}

// ============================================================================
// Progress Callback
// ============================================================================

export type ProgressCallback = (progress: number, step?: string) => void;

// ============================================================================
// Export Options
// ============================================================================

export interface PdfExportOptions {
  /** Enable debug mode (logs timing, shows borders) */
  debug?: boolean;

  /** Quality for image capture (0-1) */
  imageQuality?: number;

  /** Scale factor for canvas rendering */
  scale?: number;

  /** Maximum width in pixels for rendering */
  maxWidth?: number;
}

export interface ImageExportOptions {
  /** Image format */
  format: 'png' | 'jpeg';

  /** Quality for JPEG (0-1) */
  quality?: number;

  /** Background color */
  backgroundColor?: string;
}

// ============================================================================
// Render Options (for PDF/Image)
// ============================================================================

export interface RenderOptions {
  /** Target width in pixels */
  width: number;

  /** Page height in pixels (for PDF pagination) */
  pageHeight?: number;

  /** Dark mode */
  darkMode: boolean;

  /** Font size scale (1 = 100%) */
  fontScale: number;

  /** Show role icons */
  showIcons: boolean;
}

// ============================================================================
// File Extension and MIME Type Maps
// ============================================================================

export const FILE_EXTENSIONS: Record<ExportFormat, string> = {
  pdf: 'pdf',
  markdown: 'md',
  text: 'txt',
  json: 'json',
  csv: 'csv',
  image: 'png',
};

export const MIME_TYPES: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  markdown: 'text/markdown',
  text: 'text/plain',
  json: 'application/json',
  csv: 'text/csv',
  image: 'image/png',
};

// ============================================================================
// Filename Generation
// ============================================================================

/**
 * Generate export filename from template
 * @param template - Filename template with placeholders
 * @param conversation - Conversation data
 * @param format - Export format
 */
export function generateFilename(
  template: string,
  conversation: Conversation,
  format: ExportFormat
): string {
  const extension = FILE_EXTENSIONS[format];

  // Replace placeholders
  let filename = template
    .replace(/\{title\}/g, conversation.title)
    .replace(/\{id\}/g, conversation.id)
    .replace(/\{date\}/g, new Date().toISOString().split('T')[0])
    .replace(/\{timestamp\}/g, Date.now().toString());

  // Sanitize filename
  filename = sanitizeFilename(filename);

  // Add extension if not present
  if (!filename.endsWith(`.${extension}`)) {
    filename = `${filename}.${extension}`;
  }

  return filename;
}

/**
 * Sanitize a filename to remove invalid characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid chars
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-|-$/g, '') // Remove leading/trailing dashes
    .substring(0, 200); // Limit length
}

