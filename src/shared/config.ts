// ============================================================================
// Default Export Configuration
// Based on data-model.md specifications
// ============================================================================

import type { ExportConfig } from '../types/index.d.ts';

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  // Format
  format: 'pdf',
  filename: '{title}',
  contentTitle: '{title}',

  // PDF Settings
  pageSize: 'a4',
  orientation: 'portrait',
  margin: 'normal',
  darkMode: false,
  fontSize: 100,
  fontFamily: 'default',

  // Content Options
  includeUserInfo: false,
  userName: '',
  userEmail: '',
  showDateTime: false,
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '24h',

  // Layout Options
  showPageNumbers: true,
  showIcons: true,
  includeTableOfContents: false,
  pageBreakPerPrompt: false,

  // Misc
  showDonationPrompt: true,
};

// Page size dimensions in mm for jsPDF
export const PAGE_DIMENSIONS = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
} as const;

// Margin values in mm (reduced for more content space)
export const MARGIN_VALUES = {
  normal: { top: 15, right: 15, bottom: 15, left: 15 },
  narrow: { top: 10, right: 10, bottom: 10, left: 10 },
  wide: { top: 20, right: 30, bottom: 20, left: 30 },
} as const;

// Font size scale factors
export const FONT_SIZE_SCALE = {
  min: 50,
  max: 200,
  default: 100,
  step: 10,
} as const;

// Message limits
export const MESSAGE_LIMITS = {
  warning: 500,
  max: 1000,
  progressIndicator: 100,
} as const;

// Selector version for graceful degradation tracking
export const CURRENT_SELECTOR_VERSION = '1.0.0';

