// ============================================================================
// Config Message Handlers
// Handles GET_CONFIG and SAVE_CONFIG messages
// ============================================================================

import type { GetConfigMessage, SaveConfigMessage, ConfigResultMessage, ConfigSavedMessage } from '../../shared/messages';
import { getConfig, saveConfig } from '../../shared/storage';

/**
 * Handle GET_CONFIG message - returns current export configuration
 */
export async function handleGetConfig(
  _message: GetConfigMessage,
  _sender: chrome.runtime.MessageSender
): Promise<ConfigResultMessage> {
  const config = await getConfig();

  return {
    type: 'CONFIG_RESULT',
    payload: { config },
  };
}

/**
 * Handle SAVE_CONFIG message - persists export configuration
 */
export async function handleSaveConfig(
  message: SaveConfigMessage,
  _sender: chrome.runtime.MessageSender
): Promise<ConfigSavedMessage> {
  const success = await saveConfig(message.payload.config);

  if (success) {
    return {
      type: 'CONFIG_SAVED',
      payload: { success: true },
    };
  }

  return {
    type: 'CONFIG_SAVED',
    payload: {
      success: false,
      error: 'Failed to save configuration to storage',
    },
  };
}

