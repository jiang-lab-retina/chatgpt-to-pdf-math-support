// ============================================================================
// Service Worker Message Handlers - Aggregator
// Routes incoming messages to appropriate handlers
// ============================================================================

import type {
  ContentScriptMessage,
  PopupMessage,
  ServiceWorkerMessage,
} from '../../shared/messages';
import { isValidMessage } from '../../shared/messages';

import { handleGetConfig, handleSaveConfig } from './config';
import { handleStartExport } from './export';

export type MessageHandler = (
  message: ContentScriptMessage | PopupMessage,
  sender: chrome.runtime.MessageSender
) => Promise<ServiceWorkerMessage | null>;

/**
 * Main message router - dispatches messages to appropriate handlers
 */
export async function handleMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender
): Promise<ServiceWorkerMessage | null> {
  // Validate message structure
  if (!isValidMessage(message)) {
    console.warn('Invalid message received:', message);
    return null;
  }

  const typedMessage = message as ContentScriptMessage | PopupMessage;

  // Route to appropriate handler based on message type
  switch (typedMessage.type) {
    case 'GET_CONFIG':
      return handleGetConfig(typedMessage, sender);

    case 'SAVE_CONFIG':
      return handleSaveConfig(typedMessage, sender);

    case 'START_EXPORT':
      return handleStartExport(typedMessage, sender);

    case 'EXTRACT_CONVERSATION':
      // Extraction happens in content script, this is just for coordination
      console.log('EXTRACT_CONVERSATION received');
      return null;

    case 'REPORT_SELECTOR_FAILURE':
      // Log selector failures for debugging (no response needed)
      console.warn('Selector failure reported:', typedMessage.payload);
      return null;

    case 'GET_EXPORT_HISTORY':
      // TODO: Implement in Phase 8 (Polish)
      console.warn('GET_EXPORT_HISTORY handler not yet implemented');
      return null;

    case 'DISMISS_DONATION_PROMPT':
      // TODO: Implement in Phase 8 (Polish)
      console.warn('DISMISS_DONATION_PROMPT handler not yet implemented');
      return null;

    case 'OPEN_OPTIONS_PAGE':
      // Open the options page
      chrome.runtime.openOptionsPage();
      return null;

    default:
      console.warn('Unknown message type:', (typedMessage as { type: string }).type);
      return null;
  }
}

