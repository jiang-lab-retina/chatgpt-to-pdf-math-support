// ============================================================================
// Chrome Storage Wrapper
// Typed wrappers for chrome.storage.local and chrome.storage.session
// ============================================================================

import type { ExportConfig, ExportFormat, StorageSchema } from '../types/index.d.ts';

import { CURRENT_SELECTOR_VERSION, DEFAULT_EXPORT_CONFIG } from './config';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  EXPORT_CONFIG: 'exportConfig',
  LAST_EXPORT_FORMAT: 'lastExportFormat',
  DONATION_PROMPT_DISMISSED: 'donationPromptDismissed',
  DONATION_PROMPT_LAST_SHOWN: 'donationPromptLastShown',
  SELECTOR_VERSION: 'selectorVersion',
  LAST_SUCCESSFUL_EXTRACTION: 'lastSuccessfulExtraction',
} as const;

// ============================================================================
// Config Management
// ============================================================================

/**
 * Get the current export configuration from storage.
 * Falls back to defaults if not set.
 */
export async function getConfig(): Promise<ExportConfig> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.EXPORT_CONFIG);
    const stored = result[STORAGE_KEYS.EXPORT_CONFIG] as Partial<ExportConfig> | undefined;

    if (stored) {
      // Merge with defaults to handle any missing fields from older versions
      return { ...DEFAULT_EXPORT_CONFIG, ...stored };
    }

    return { ...DEFAULT_EXPORT_CONFIG };
  } catch (error) {
    console.error('Failed to get config from storage:', error);
    return { ...DEFAULT_EXPORT_CONFIG };
  }
}

/**
 * Save export configuration to storage.
 * Supports partial updates - only provided fields are updated.
 */
export async function saveConfig(config: Partial<ExportConfig>): Promise<boolean> {
  try {
    const current = await getConfig();
    const updated = { ...current, ...config };

    await chrome.storage.local.set({
      [STORAGE_KEYS.EXPORT_CONFIG]: updated,
    });

    return true;
  } catch (error) {
    console.error('Failed to save config to storage:', error);
    return false;
  }
}

/**
 * Get the default export configuration.
 */
export function getDefaultConfig(): ExportConfig {
  return { ...DEFAULT_EXPORT_CONFIG };
}

/**
 * Reset configuration to defaults.
 */
export async function resetConfig(): Promise<boolean> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.EXPORT_CONFIG]: DEFAULT_EXPORT_CONFIG,
    });
    return true;
  } catch (error) {
    console.error('Failed to reset config:', error);
    return false;
  }
}

// ============================================================================
// Last Export Format
// ============================================================================

export async function getLastExportFormat(): Promise<ExportFormat> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_EXPORT_FORMAT);
    return (result[STORAGE_KEYS.LAST_EXPORT_FORMAT] as ExportFormat) || 'pdf';
  } catch (error) {
    console.error('Failed to get last export format:', error);
    return 'pdf';
  }
}

export async function setLastExportFormat(format: ExportFormat): Promise<boolean> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.LAST_EXPORT_FORMAT]: format,
    });
    return true;
  } catch (error) {
    console.error('Failed to set last export format:', error);
    return false;
  }
}

// ============================================================================
// Donation Prompt State
// ============================================================================

export async function getDonationPromptState(): Promise<{
  dismissed: boolean;
  lastShown: number;
}> {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.DONATION_PROMPT_DISMISSED,
      STORAGE_KEYS.DONATION_PROMPT_LAST_SHOWN,
    ]);

    return {
      dismissed: result[STORAGE_KEYS.DONATION_PROMPT_DISMISSED] || false,
      lastShown: result[STORAGE_KEYS.DONATION_PROMPT_LAST_SHOWN] || 0,
    };
  } catch (error) {
    console.error('Failed to get donation prompt state:', error);
    return { dismissed: false, lastShown: 0 };
  }
}

export async function setDonationPromptDismissed(permanent: boolean): Promise<boolean> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.DONATION_PROMPT_DISMISSED]: permanent,
      [STORAGE_KEYS.DONATION_PROMPT_LAST_SHOWN]: Date.now(),
    });
    return true;
  } catch (error) {
    console.error('Failed to set donation prompt state:', error);
    return false;
  }
}

// ============================================================================
// Selector Version Tracking (for graceful degradation)
// ============================================================================

export async function getSelectorVersion(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SELECTOR_VERSION);
    return (result[STORAGE_KEYS.SELECTOR_VERSION] as string) || CURRENT_SELECTOR_VERSION;
  } catch (error) {
    console.error('Failed to get selector version:', error);
    return CURRENT_SELECTOR_VERSION;
  }
}

export async function setSelectorVersion(version: string): Promise<boolean> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SELECTOR_VERSION]: version,
    });
    return true;
  } catch (error) {
    console.error('Failed to set selector version:', error);
    return false;
  }
}

export async function recordSuccessfulExtraction(): Promise<boolean> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.LAST_SUCCESSFUL_EXTRACTION]: Date.now(),
    });
    return true;
  } catch (error) {
    console.error('Failed to record successful extraction:', error);
    return false;
  }
}

// ============================================================================
// Full Storage Schema Access
// ============================================================================

export async function getAllStorageData(): Promise<Partial<StorageSchema>> {
  try {
    const result = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
    return {
      exportConfig: result[STORAGE_KEYS.EXPORT_CONFIG],
      lastExportFormat: result[STORAGE_KEYS.LAST_EXPORT_FORMAT],
      donationPromptDismissed: result[STORAGE_KEYS.DONATION_PROMPT_DISMISSED],
      donationPromptLastShown: result[STORAGE_KEYS.DONATION_PROMPT_LAST_SHOWN],
      selectorVersion: result[STORAGE_KEYS.SELECTOR_VERSION],
      lastSuccessfulExtraction: result[STORAGE_KEYS.LAST_SUCCESSFUL_EXTRACTION],
    };
  } catch (error) {
    console.error('Failed to get all storage data:', error);
    return {};
  }
}

export async function clearAllStorage(): Promise<boolean> {
  try {
    await chrome.storage.local.clear();
    return true;
  } catch (error) {
    console.error('Failed to clear storage:', error);
    return false;
  }
}

