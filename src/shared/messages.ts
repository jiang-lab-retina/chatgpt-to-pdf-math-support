// ============================================================================
// Message Passing - Typed Message Schemas
// Based on contracts/messages.md
// ============================================================================

import type {
  Conversation,
  ExportConfig,
  ExportFormat,
  ExportStatus,
} from '../types/index.d.ts';

// ============================================================================
// Content Script → Service Worker Messages
// ============================================================================

export interface ExtractConversationMessage {
  type: 'EXTRACT_CONVERSATION';
  payload: {
    url: string;
    title: string;
  };
}

export interface StartExportMessage {
  type: 'START_EXPORT';
  payload: {
    conversation: Conversation;
    selectedMessageIds: string[];
    config: ExportConfig;
  };
}

export interface GetConfigMessage {
  type: 'GET_CONFIG';
  payload: Record<string, never>;
}

export interface SaveConfigMessage {
  type: 'SAVE_CONFIG';
  payload: {
    config: Partial<ExportConfig>;
  };
}

export interface ReportSelectorFailureMessage {
  type: 'REPORT_SELECTOR_FAILURE';
  payload: {
    selectorName: string;
    attemptedSelectors: string[];
    pageUrl: string;
    timestamp: number;
  };
}

export type ContentScriptMessage =
  | ExtractConversationMessage
  | StartExportMessage
  | GetConfigMessage
  | SaveConfigMessage
  | ReportSelectorFailureMessage;

// ============================================================================
// Service Worker → Content Script Messages
// ============================================================================

export interface ExtractionResultMessage {
  type: 'EXTRACTION_RESULT';
  payload: {
    success: boolean;
    conversation?: Conversation;
    error?: string;
    warnings?: string[];
  };
}

export interface ExportProgressMessage {
  type: 'EXPORT_PROGRESS';
  payload: {
    jobId: string;
    status: ExportStatus;
    progress: number;
    currentStep: string;
  };
}

export interface ExportCompleteMessage {
  type: 'EXPORT_COMPLETE';
  payload: {
    jobId: string;
    filename: string;
    format: ExportFormat;
    blobUrl: string;
    byteSize: number;
  };
}

export interface ExportErrorMessage {
  type: 'EXPORT_ERROR';
  payload: {
    jobId: string;
    error: string;
    recoverable: boolean;
    suggestion?: string;
  };
}

export interface ConfigResultMessage {
  type: 'CONFIG_RESULT';
  payload: {
    config: ExportConfig;
  };
}

export interface ConfigSavedMessage {
  type: 'CONFIG_SAVED';
  payload: {
    success: boolean;
    error?: string;
  };
}

export interface SelectorUpdateAvailableMessage {
  type: 'SELECTOR_UPDATE_AVAILABLE';
  payload: {
    version: string;
    changelog: string;
  };
}

export type ServiceWorkerMessage =
  | ExtractionResultMessage
  | ExportProgressMessage
  | ExportCompleteMessage
  | ExportErrorMessage
  | ConfigResultMessage
  | ConfigSavedMessage
  | SelectorUpdateAvailableMessage;

// ============================================================================
// Popup/Options → Service Worker Messages
// ============================================================================

export interface GetExportHistoryMessage {
  type: 'GET_EXPORT_HISTORY';
  payload: {
    limit: number;
  };
}

export interface ExportHistoryResultMessage {
  type: 'EXPORT_HISTORY_RESULT';
  payload: {
    exports: Array<{
      id: string;
      conversationTitle: string;
      format: ExportFormat;
      timestamp: number;
      success: boolean;
    }>;
  };
}

export interface DismissDonationPromptMessage {
  type: 'DISMISS_DONATION_PROMPT';
  payload: {
    permanent: boolean;
  };
}

export interface OpenOptionsPageMessage {
  type: 'OPEN_OPTIONS_PAGE';
  payload?: Record<string, never>;
}

export type PopupMessage =
  | GetConfigMessage
  | SaveConfigMessage
  | GetExportHistoryMessage
  | DismissDonationPromptMessage
  | OpenOptionsPageMessage;

// ============================================================================
// All Message Types
// ============================================================================

export type AllMessages =
  | ContentScriptMessage
  | ServiceWorkerMessage
  | PopupMessage
  | ExportHistoryResultMessage;

// ============================================================================
// Message Validation
// ============================================================================

const VALID_MESSAGE_TYPES = new Set([
  'EXTRACT_CONVERSATION',
  'START_EXPORT',
  'GET_CONFIG',
  'SAVE_CONFIG',
  'REPORT_SELECTOR_FAILURE',
  'EXTRACTION_RESULT',
  'EXPORT_PROGRESS',
  'EXPORT_COMPLETE',
  'EXPORT_ERROR',
  'CONFIG_RESULT',
  'CONFIG_SAVED',
  'SELECTOR_UPDATE_AVAILABLE',
  'GET_EXPORT_HISTORY',
  'EXPORT_HISTORY_RESULT',
  'DISMISS_DONATION_PROMPT',
  'OPEN_OPTIONS_PAGE',
]);

export function isValidMessage(msg: unknown): msg is AllMessages {
  if (typeof msg !== 'object' || msg === null) {
    return false;
  }

  const maybeMessage = msg as { type?: unknown };

  if (typeof maybeMessage.type !== 'string') {
    return false;
  }

  return VALID_MESSAGE_TYPES.has(maybeMessage.type);
}

export function isContentScriptMessage(msg: unknown): msg is ContentScriptMessage {
  if (!isValidMessage(msg)) return false;

  const contentScriptTypes = [
    'EXTRACT_CONVERSATION',
    'START_EXPORT',
    'GET_CONFIG',
    'SAVE_CONFIG',
    'REPORT_SELECTOR_FAILURE',
  ];

  return contentScriptTypes.includes(msg.type);
}

export function isServiceWorkerMessage(msg: unknown): msg is ServiceWorkerMessage {
  if (!isValidMessage(msg)) return false;

  const serviceWorkerTypes = [
    'EXTRACTION_RESULT',
    'EXPORT_PROGRESS',
    'EXPORT_COMPLETE',
    'EXPORT_ERROR',
    'CONFIG_RESULT',
    'CONFIG_SAVED',
    'SELECTOR_UPDATE_AVAILABLE',
  ];

  return serviceWorkerTypes.includes(msg.type);
}

// ============================================================================
// Message Creators (Factory Functions)
// ============================================================================

export function createGetConfigMessage(): GetConfigMessage {
  return { type: 'GET_CONFIG', payload: {} };
}

export function createSaveConfigMessage(config: Partial<ExportConfig>): SaveConfigMessage {
  return { type: 'SAVE_CONFIG', payload: { config } };
}

export function createStartExportMessage(
  conversation: Conversation,
  selectedMessageIds: string[],
  config: ExportConfig
): StartExportMessage {
  return {
    type: 'START_EXPORT',
    payload: { conversation, selectedMessageIds, config },
  };
}

export function createExportProgressMessage(
  jobId: string,
  status: ExportStatus,
  progress: number,
  currentStep: string
): ExportProgressMessage {
  return {
    type: 'EXPORT_PROGRESS',
    payload: { jobId, status, progress, currentStep },
  };
}

export function createExportCompleteMessage(
  jobId: string,
  filename: string,
  format: ExportFormat,
  blobUrl: string,
  byteSize: number
): ExportCompleteMessage {
  return {
    type: 'EXPORT_COMPLETE',
    payload: { jobId, filename, format, blobUrl, byteSize },
  };
}

export function createExportErrorMessage(
  jobId: string,
  error: string,
  recoverable: boolean,
  suggestion?: string
): ExportErrorMessage {
  return {
    type: 'EXPORT_ERROR',
    payload: { jobId, error, recoverable, suggestion },
  };
}

