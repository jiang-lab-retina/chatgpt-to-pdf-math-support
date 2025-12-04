# Implementation Plan: ChatGPT Conversation Exporter

**Branch**: `001-chatgpt-exporter` | **Date**: 2025-12-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-chatgpt-exporter/spec.md`

## Summary

Build a Chrome extension (Manifest V3) that injects a floating toolbar into chatgpt.com conversation pages, enabling users to export conversations to PDF, Markdown, Text, JSON, CSV, and Image formats. All processing occurs client-side for maximum privacy. The extension supports selective message export, customizable PDF formatting, and graceful degradation when ChatGPT's DOM structure changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: 
- Chrome Extension APIs (Manifest V3)
- jsPDF + html2canvas (client-side PDF generation)
- KaTeX (LaTeX math rendering)
- Prism.js or highlight.js (code syntax highlighting)

**Storage**: chrome.storage.local (user preferences), chrome.storage.session (transient state)  
**Testing**: Vitest (unit tests), Playwright (E2E extension testing)  
**Target Platform**: Chrome 116+, Edge 116+, Brave (Chromium-based browsers)
**Project Type**: Chrome Extension (single project with modular architecture)  
**Performance Goals**: 
- Toolbar injection: <2 seconds
- Export (≤100 messages): <30 seconds
- Export (≤500 messages): <2 minutes
- Memory usage: <50MB typical operation

**Constraints**: 
- Client-side only (no server communication for export)
- Manifest V3 compliance (service workers, no remote code)
- Host permissions scoped to chatgpt.com only

**Scale/Scope**: Single-user browser extension, conversations up to 1000 messages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Manifest V3 Compliance** | ✅ PASS | Using service workers, chrome.scripting API, all code bundled at build time |
| **II. Minimal Permissions** | ✅ PASS | Only `activeTab`, `storage`, host permission for `*://chatgpt.com/*` |
| **III. User Privacy First** | ✅ PASS | All processing client-side (FR-029, FR-030, FR-031), no data transmission |
| **IV. Secure Communication** | ✅ PASS | No external API calls; CSP enforced; typed message passing |
| **V. Modular Architecture** | ✅ PASS | Clear separation: service worker, content script, popup UI, shared utils |

**Chrome Extension Constraints Check:**

| Constraint | Status | Evidence |
|------------|--------|----------|
| Chrome Web Store Compliance | ✅ PASS | Single-purpose (export conversations), minimal permissions |
| Performance Budget | ✅ PASS | Service worker <500ms, content script non-blocking |
| Offline Capability | ✅ PASS | All export fully offline (client-side processing) |
| Accessibility | ⚠️ PENDING | Must implement WCAG 2.1 AA in UI components |
| Internationalization | ⚠️ PENDING | Must use chrome.i18n API for all user-facing strings |

## Project Structure

### Documentation (this feature)

```text
specs/001-chatgpt-exporter/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal message schemas)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── manifest.json           # Manifest V3 configuration
├── service-worker/         # Background service worker
│   ├── index.ts            # Service worker entry point
│   └── handlers/           # Message handlers
├── content/                # Content scripts (injected into chatgpt.com)
│   ├── index.ts            # Content script entry point
│   ├── dom/                # DOM extraction utilities
│   │   ├── parser.ts       # ChatGPT DOM parser
│   │   ├── selectors.ts    # DOM selectors (isolated for updates)
│   │   └── types.ts        # Extracted content types
│   ├── ui/                 # Injected UI components
│   │   ├── toolbar.ts      # Floating toolbar
│   │   ├── checkbox.ts     # Message selection checkboxes
│   │   ├── dialogs/        # Export configuration dialogs
│   │   └── styles.css      # Injected styles
│   └── selection/          # Message selection state management
├── popup/                  # Extension popup UI
│   ├── index.html
│   ├── popup.ts
│   └── styles.css
├── options/                # Options/settings page
│   ├── index.html
│   ├── options.ts
│   └── styles.css
├── exporters/              # Export format implementations
│   ├── pdf.ts              # PDF export (jsPDF + html2canvas)
│   ├── markdown.ts         # Markdown export
│   ├── json.ts             # JSON export
│   ├── csv.ts              # CSV export
│   ├── text.ts             # Plain text export
│   ├── image.ts            # Image export (html2canvas)
│   └── types.ts            # Common export interfaces
├── shared/                 # Shared utilities
│   ├── messages.ts         # Typed message schemas
│   ├── storage.ts          # chrome.storage wrappers
│   ├── config.ts           # Default configuration
│   └── i18n.ts             # Internationalization helpers
└── types/                  # Global TypeScript types
    └── index.d.ts

tests/
├── unit/                   # Unit tests (Vitest)
│   ├── exporters/
│   ├── dom/
│   └── shared/
├── integration/            # Integration tests
│   └── messaging/
└── e2e/                    # End-to-end tests (Playwright)
    └── export-flow.spec.ts

_locales/                   # Chrome i18n localization
└── en/
    └── messages.json
```

**Structure Decision**: Chrome Extension structure with clear separation per Constitution Principle V. Content scripts handle DOM interaction, service worker coordinates background tasks, exporters are isolated modules for each format.

## Complexity Tracking

No constitution violations requiring justification. Architecture follows all five principles.
