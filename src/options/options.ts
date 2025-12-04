// ============================================================================
// Options Page Script
// Settings management UI for ChatGPT to PDF
// ============================================================================

import { getConfig, saveConfig, resetConfig } from '../shared/storage';
import type { ExportConfig } from '../types/index.d.ts';

// ============================================================================
// DOM Elements
// ============================================================================

const darkModeCheckbox = document.getElementById('darkMode') as HTMLInputElement;
const showPageNumbersCheckbox = document.getElementById('showPageNumbers') as HTMLInputElement;
const showIconsCheckbox = document.getElementById('showIcons') as HTMLInputElement;
const showDonationPromptCheckbox = document.getElementById('showDonationPrompt') as HTMLInputElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const statusMessage = document.getElementById('statusMessage') as HTMLDivElement;

// ============================================================================
// Load Settings
// ============================================================================

async function loadSettings(): Promise<void> {
  const config = await getConfig();
  
  darkModeCheckbox.checked = config.darkMode;
  showPageNumbersCheckbox.checked = config.showPageNumbers;
  showIconsCheckbox.checked = config.showIcons;
  showDonationPromptCheckbox.checked = config.showDonationPrompt;
}

// ============================================================================
// Save Settings
// ============================================================================

async function saveSettings(): Promise<void> {
  const updates: Partial<ExportConfig> = {
    format: 'pdf', // Always PDF
    darkMode: darkModeCheckbox.checked,
    showPageNumbers: showPageNumbersCheckbox.checked,
    showIcons: showIconsCheckbox.checked,
    showDonationPrompt: showDonationPromptCheckbox.checked,
  };
  
  const success = await saveConfig(updates);
  
  if (success) {
    showStatus('Settings saved successfully!', 'success');
  } else {
    showStatus('Failed to save settings', 'error');
  }
}

// ============================================================================
// Reset Settings
// ============================================================================

async function handleReset(): Promise<void> {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    const success = await resetConfig();
    
    if (success) {
      await loadSettings();
      showStatus('Settings reset to defaults', 'success');
    } else {
      showStatus('Failed to reset settings', 'error');
    }
  }
}

// ============================================================================
// Status Message
// ============================================================================

function showStatus(message: string, type: 'success' | 'error'): void {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
  
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
}

// ============================================================================
// Event Listeners
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  void loadSettings();
  
  saveBtn.addEventListener('click', () => void saveSettings());
  resetBtn.addEventListener('click', () => void handleReset());
});

