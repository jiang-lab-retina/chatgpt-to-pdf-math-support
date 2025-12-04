// ============================================================================
// Export Handler (Content Script)
// Handles export operations in the content script context
// where DOM access is available
// ============================================================================

import type { Conversation, Message, ExportConfig } from '../types/index.d.ts';
import { createPdfExporter } from '../exporters/pdf';
import { generateFilename } from '../exporters/types';

export interface ExportOptions {
  conversation: Conversation;
  messages: Message[];
  config: ExportConfig;
  onProgress?: (progress: number, step: string) => void;
}

export interface ExportHandlerResult {
  success: boolean;
  filename?: string;
  error?: string;
}

/**
 * Execute export in the content script context
 * This is necessary because PDF export requires DOM access (html2canvas)
 */
export async function executeExport(options: ExportOptions): Promise<ExportHandlerResult> {
  const { conversation, messages, config, onProgress } = options;

  try {
    onProgress?.(10, 'Preparing export...');

    // Currently only PDF is implemented
    if (config.format !== 'pdf') {
      return {
        success: false,
        error: `Export format "${config.format}" not yet implemented`,
      };
    }

    onProgress?.(20, 'Creating PDF exporter...');

    const exporter = createPdfExporter();

    onProgress?.(30, 'Rendering content...');

    // Execute export with progress callback
    const result = await exporter.export(
      conversation,
      messages,
      config,
      (progress: number) => {
        const scaledProgress = 30 + Math.floor(progress * 0.5); // Scale to 30-80%
        onProgress?.(scaledProgress, 'Generating PDF...');
      }
    );

    if (!result.success || !result.blob) {
      return {
        success: false,
        error: result.error || 'Export failed',
      };
    }

    onProgress?.(85, 'Preparing download...');

    // Generate filename
    const filename = generateFilename(config.filename, conversation, config.format);

    // Create download link and trigger download
    const blobUrl = URL.createObjectURL(result.blob);
    
    try {
      await triggerDownload(blobUrl, filename);
    } finally {
      // Clean up blob URL
      URL.revokeObjectURL(blobUrl);
    }

    onProgress?.(100, 'Complete!');

    return {
      success: true,
      filename,
    };
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Trigger file download using a temporary anchor element
 */
function triggerDownload(blobUrl: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Small delay to ensure download starts
      setTimeout(resolve, 100);
    } catch (error) {
      reject(error);
    }
  });
}

