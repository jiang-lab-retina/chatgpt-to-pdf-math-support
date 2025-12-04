// ============================================================================
// Service Worker Entry Point
// Chrome Extension Manifest V3 Background Service Worker
// ============================================================================

import { handleMessage } from './handlers/index';

// ============================================================================
// Message Listener
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle message asynchronously
  handleMessage(message, sender)
    .then(response => {
      if (response) {
        sendResponse(response);
      }
    })
    .catch(error => {
      console.error('Error handling message:', error);
      sendResponse(null);
    });

  // Return true to indicate we will send a response asynchronously
  return true;
});

// ============================================================================
// Installation & Update Handlers
// ============================================================================

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('ChatGPT Exporter installed');
    // Initialize default settings on first install
  } else if (details.reason === 'update') {
    console.log(`ChatGPT Exporter updated from ${details.previousVersion || 'unknown'}`);
    // Handle migration if needed
  }
});

// ============================================================================
// Service Worker Lifecycle
// ============================================================================

// Keep service worker alive during active operations
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

export function startKeepAlive(): void {
  if (keepAliveInterval) return;

  // Ping every 20 seconds to prevent service worker from going idle during export
  keepAliveInterval = setInterval(() => {
    // No-op to keep service worker alive
  }, 20000);
}

export function stopKeepAlive(): void {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Log service worker startup
console.log('ChatGPT Exporter service worker started');

