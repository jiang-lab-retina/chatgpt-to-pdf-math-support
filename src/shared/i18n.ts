// ============================================================================
// Internationalization Helpers
// Wrapper for chrome.i18n API
// ============================================================================

/**
 * Get a localized message by key.
 * Falls back to the key itself if message not found.
 *
 * @param key - The message key from messages.json
 * @param substitutions - Optional substitution strings for placeholders
 * @returns The localized message string
 */
export function getMessage(key: string, substitutions?: string | string[]): string {
  try {
    const message = chrome.i18n.getMessage(key, substitutions);
    return message || key;
  } catch {
    // Fallback for when chrome.i18n is not available (e.g., in tests)
    return key;
  }
}

/**
 * Get the user's UI language.
 * @returns Language code (e.g., 'en', 'zh', 'ja')
 */
export function getUILanguage(): string {
  try {
    return chrome.i18n.getUILanguage();
  } catch {
    return 'en';
  }
}

/**
 * Get all accepted languages in order of preference.
 * @returns Promise resolving to array of language codes
 */
export async function getAcceptLanguages(): Promise<string[]> {
  try {
    return await chrome.i18n.getAcceptLanguages();
  } catch {
    return ['en'];
  }
}

// ============================================================================
// Pre-defined Message Keys (for type safety and autocomplete)
// ============================================================================

export const I18N_KEYS = {
  // Extension info
  extensionName: 'extensionName',
  extensionDescription: 'extensionDescription',

  // Toolbar
  toolbarExport: 'toolbarExport',
  toolbarSelect: 'toolbarSelect',
  toolbarCancel: 'toolbarCancel',
  toolbarSettings: 'toolbarSettings',

  // Selection options
  selectAll: 'selectAll',
  selectQuestions: 'selectQuestions',
  selectAnswers: 'selectAnswers',
  selectNone: 'selectNone',

  // Export formats
  formatPdf: 'formatPdf',
  formatMarkdown: 'formatMarkdown',
  formatText: 'formatText',
  formatJson: 'formatJson',
  formatCsv: 'formatCsv',
  formatImage: 'formatImage',

  // Status messages
  exportProgress: 'exportProgress',
  exportComplete: 'exportComplete',
  exportError: 'exportError',

  // Error messages
  errorNoMessages: 'errorNoMessages',
  errorTooManyMessages: 'errorTooManyMessages',
  warningLargeConversation: 'warningLargeConversation',
  domExtractionWarning: 'domExtractionWarning',
} as const;

export type I18nKey = (typeof I18N_KEYS)[keyof typeof I18N_KEYS];

/**
 * Type-safe message getter using predefined keys
 */
export function getMessageTyped(key: I18nKey, substitutions?: string | string[]): string {
  return getMessage(key, substitutions);
}

