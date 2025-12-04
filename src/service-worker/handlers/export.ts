// ============================================================================
// Export Message Handlers
// Handles START_EXPORT and related export operations
// ============================================================================

import type { ExportJob, ExportStatus } from '../../types/index.d.ts';
import type {
  StartExportMessage,
  ExportProgressMessage,
  ExportErrorMessage,
} from '../../shared/messages';
import {
  createExportProgressMessage,
  createExportCompleteMessage,
  createExportErrorMessage,
} from '../../shared/messages';
import { MESSAGE_LIMITS } from '../../shared/config';
import { setLastExportFormat } from '../../shared/storage';
import { createPdfExporter } from '../../exporters/pdf';
import { generateFilename } from '../../exporters/types';

// ============================================================================
// Export Job State
// ============================================================================

let currentJob: ExportJob | null = null;

// ============================================================================
// Export Handler
// ============================================================================

/**
 * Handle START_EXPORT message - initiates export job
 */
export async function handleStartExport(
  message: StartExportMessage,
  sender: chrome.runtime.MessageSender
): Promise<ExportProgressMessage | ExportErrorMessage> {
  const { conversation, selectedMessageIds, config } = message.payload;
  const tabId = sender.tab?.id;

  // Validate message count
  if (selectedMessageIds.length === 0) {
    return createExportErrorMessage(
      'error-no-messages',
      'No messages selected for export',
      true,
      'Please select at least one message to export'
    );
  }

  if (selectedMessageIds.length > MESSAGE_LIMITS.max) {
    return createExportErrorMessage(
      'error-limit-exceeded',
      `Conversation exceeds ${MESSAGE_LIMITS.max} message limit`,
      false
    );
  }

  // Create job ID
  const jobId = `export-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Initialize job state
  currentJob = {
    id: jobId,
    conversationId: conversation.id,
    format: config.format,
    config,
    selectedMessageIds,
    status: 'pending',
    progress: 0,
    error: null,
    startedAt: new Date(),
    completedAt: null,
  };

  // Filter messages to selected ones
  const selectedMessages = conversation.messages.filter(m =>
    selectedMessageIds.includes(m.id)
  );

  // Send initial progress
  sendProgressToTab(tabId, jobId, 'pending', 0, 'Starting export...');

  // Execute export asynchronously
  void executeExport(jobId, conversation, selectedMessages, config, tabId);

  // Return initial progress message
  return createExportProgressMessage(jobId, 'pending', 0, 'Starting export...');
}

/**
 * Execute the export job
 */
async function executeExport(
  jobId: string,
  conversation: StartExportMessage['payload']['conversation'],
  selectedMessages: StartExportMessage['payload']['conversation']['messages'],
  config: StartExportMessage['payload']['config'],
  tabId?: number
): Promise<void> {
  try {
    updateJobStatus(jobId, 'extracting', 10);
    sendProgressToTab(tabId, jobId, 'extracting', 10, 'Preparing content...');

    // Save last used format
    await setLastExportFormat(config.format);

    updateJobStatus(jobId, 'rendering', 20);
    sendProgressToTab(tabId, jobId, 'rendering', 20, 'Rendering content...');

    // Create exporter based on format
    // For MVP, only PDF is implemented
    if (config.format !== 'pdf') {
      throw new Error(`Export format "${config.format}" not yet implemented`);
    }

    const exporter = createPdfExporter();

    updateJobStatus(jobId, 'generating', 30);

    // Execute export with progress callback
    const result = await exporter.export(
      conversation,
      selectedMessages,
      config,
      (progress: number) => {
        const scaledProgress = 30 + Math.floor(progress * 0.6); // Scale to 30-90%
        updateJobStatus(jobId, 'generating', scaledProgress);
        sendProgressToTab(tabId, jobId, 'generating', scaledProgress, 'Generating PDF...');
      }
    );

    if (!result.success || !result.blob) {
      throw new Error(result.error || 'Export failed');
    }

    updateJobStatus(jobId, 'completed', 100);

    // Generate filename
    const filename = generateFilename(config.filename, conversation, config.format);

    // Create blob URL for download
    const blobUrl = URL.createObjectURL(result.blob);

    // Trigger download
    await triggerDownload(blobUrl, filename);

    // Send completion message
    sendCompletionToTab(tabId, jobId, filename, config.format, blobUrl, result.byteSize || 0);

    // Mark job as completed
    if (currentJob && currentJob.id === jobId) {
      currentJob.status = 'completed';
      currentJob.completedAt = new Date();
    }
  } catch (error) {
    console.error('Export error:', error);

    updateJobStatus(jobId, 'failed', 0);

    // Send error message
    sendErrorToTab(
      tabId,
      jobId,
      error instanceof Error ? error.message : 'Unknown export error',
      true
    );

    // Mark job as failed
    if (currentJob && currentJob.id === jobId) {
      currentJob.status = 'failed';
      currentJob.error = error instanceof Error ? error.message : 'Unknown error';
      currentJob.completedAt = new Date();
    }
  }
}

// ============================================================================
// Job State Management
// ============================================================================

function updateJobStatus(jobId: string, status: ExportStatus, progress: number): void {
  if (currentJob && currentJob.id === jobId) {
    currentJob.status = status;
    currentJob.progress = progress;
  }
}

// ============================================================================
// Tab Communication
// ============================================================================

function sendProgressToTab(
  tabId: number | undefined,
  jobId: string,
  status: ExportStatus,
  progress: number,
  step: string
): void {
  if (!tabId) return;

  const message = createExportProgressMessage(jobId, status, progress, step);
  void chrome.tabs.sendMessage(tabId, message).catch(() => {
    // Tab may be closed or unavailable
  });
}

function sendCompletionToTab(
  tabId: number | undefined,
  jobId: string,
  filename: string,
  format: StartExportMessage['payload']['config']['format'],
  blobUrl: string,
  byteSize: number
): void {
  if (!tabId) return;

  const message = createExportCompleteMessage(jobId, filename, format, blobUrl, byteSize);
  void chrome.tabs.sendMessage(tabId, message).catch(() => {
    // Tab may be closed or unavailable
  });
}

function sendErrorToTab(
  tabId: number | undefined,
  jobId: string,
  error: string,
  recoverable: boolean
): void {
  if (!tabId) return;

  const message = createExportErrorMessage(jobId, error, recoverable);
  void chrome.tabs.sendMessage(tabId, message).catch(() => {
    // Tab may be closed or unavailable
  });
}

// ============================================================================
// Download Trigger
// ============================================================================

async function triggerDownload(blobUrl: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: blobUrl,
        filename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (downloadId === undefined) {
          reject(new Error('Download failed to start'));
        } else {
          resolve();
        }
      }
    );
  });
}

// ============================================================================
// Export State Access
// ============================================================================

export function getCurrentExportJob(): ExportJob | null {
  return currentJob;
}

export function clearCurrentExportJob(): void {
  currentJob = null;
}

