// ============================================================================
// Popup Script
// Extension popup UI logic
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Settings button click
  const openOptionsBtn = document.getElementById('openOptions');
  if (openOptionsBtn) {
    openOptionsBtn.addEventListener('click', () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options/index.html'));
      }
    });
  }
});

