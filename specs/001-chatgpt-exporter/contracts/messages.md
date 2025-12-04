# Internal Message Contracts

**Feature**: 001-chatgpt-exporter  
**Date**: 2025-12-03  
**Purpose**: Define typed message schemas for Chrome extension internal communication

## Overview

Chrome extensions use message passing for communication between:
- **Content Script** ↔ **Service Worker**
- **Popup** ↔ **Service Worker**
- **Options Page** ↔ **Service Worker**

All messages follow a discriminated union pattern with `type` as the discriminator.

---

## Message Flow Diagram

```
┌─────────────────┐                    ┌─────────────────┐
│  Content Script │                    │ Service Worker  │
│  (chatgpt.com)  │                    │   (Background)  │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │──── EXTRACT_CONVERSATION ───────────>│
         │<─── EXTRACTION_RESULT ───────────────│
         │                                      │
         │──── START_EXPORT ───────────────────>│
         │<─── EXPORT_PROGRESS ─────────────────│
         │<─── EXPORT_COMPLETE ─────────────────│
         │<─── EXPORT_ERROR ────────────────────│
         │                                      │
         │──── GET_CONFIG ─────────────────────>│
         │<─── CONFIG_RESULT ───────────────────│
         │                                      │
         │──── SAVE_CONFIG ────────────────────>│
         │<─── CONFIG_SAVED ────────────────────│
         │                                      │
```

---

## Content Script → Service Worker Messages

### EXTRACT_CONVERSATION

Request to extract conversation data from the current page.

```typescript
interface ExtractConversationMessage {
  type: 'EXTRACT_CONVERSATION';
  payload: {
    url: string;
    title: string;
  };
}
```

### START_EXPORT

Initiate an export job with the given configuration.

```typescript
interface StartExportMessage {
  type: 'START_EXPORT';
  payload: {
    conversation: Conversation;
    selectedMessageIds: string[];
    config: ExportConfig;
  };
}
```

### GET_CONFIG

Request current export configuration.

```typescript
interface GetConfigMessage {
  type: 'GET_CONFIG';
  payload: Record<string, never>; // empty
}
```

### SAVE_CONFIG

Persist updated export configuration.

```typescript
interface SaveConfigMessage {
  type: 'SAVE_CONFIG';
  payload: {
    config: Partial<ExportConfig>;
  };
}
```

### REPORT_SELECTOR_FAILURE

Report when DOM selectors fail to match.

```typescript
interface ReportSelectorFailureMessage {
  type: 'REPORT_SELECTOR_FAILURE';
  payload: {
    selectorName: string;
    attemptedSelectors: string[];
    pageUrl: string;
    timestamp: number;
  };
}
```

---

## Service Worker → Content Script Messages

### EXTRACTION_RESULT

Response to EXTRACT_CONVERSATION with extracted data.

```typescript
interface ExtractionResultMessage {
  type: 'EXTRACTION_RESULT';
  payload: {
    success: boolean;
    conversation?: Conversation;
    error?: string;
    warnings?: string[]; // partial extraction warnings
  };
}
```

### EXPORT_PROGRESS

Progress update during export operation.

```typescript
interface ExportProgressMessage {
  type: 'EXPORT_PROGRESS';
  payload: {
    jobId: string;
    status: ExportStatus;
    progress: number; // 0-100
    currentStep: string; // human-readable step description
  };
}
```

### EXPORT_COMPLETE

Export job completed successfully.

```typescript
interface ExportCompleteMessage {
  type: 'EXPORT_COMPLETE';
  payload: {
    jobId: string;
    filename: string;
    format: ExportFormat;
    blobUrl: string; // for download
    byteSize: number;
  };
}
```

### EXPORT_ERROR

Export job failed.

```typescript
interface ExportErrorMessage {
  type: 'EXPORT_ERROR';
  payload: {
    jobId: string;
    error: string;
    recoverable: boolean;
    suggestion?: string;
  };
}
```

### CONFIG_RESULT

Response to GET_CONFIG.

```typescript
interface ConfigResultMessage {
  type: 'CONFIG_RESULT';
  payload: {
    config: ExportConfig;
  };
}
```

### CONFIG_SAVED

Confirmation of SAVE_CONFIG.

```typescript
interface ConfigSavedMessage {
  type: 'CONFIG_SAVED';
  payload: {
    success: boolean;
    error?: string;
  };
}
```

### SELECTOR_UPDATE_AVAILABLE

Notify content script that new selectors are available.

```typescript
interface SelectorUpdateAvailableMessage {
  type: 'SELECTOR_UPDATE_AVAILABLE';
  payload: {
    version: string;
    changelog: string;
  };
}
```

---

## Popup/Options → Service Worker Messages

### GET_EXPORT_HISTORY

Request recent export history for display.

```typescript
interface GetExportHistoryMessage {
  type: 'GET_EXPORT_HISTORY';
  payload: {
    limit: number;
  };
}
```

### EXPORT_HISTORY_RESULT

Response with export history.

```typescript
interface ExportHistoryResultMessage {
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
```

### DISMISS_DONATION_PROMPT

User dismissed donation prompt.

```typescript
interface DismissDonationPromptMessage {
  type: 'DISMISS_DONATION_PROMPT';
  payload: {
    permanent: boolean; // true = never show again
  };
}
```

---

## Union Types

### All Content Script Messages

```typescript
type ContentScriptMessage =
  | ExtractConversationMessage
  | StartExportMessage
  | GetConfigMessage
  | SaveConfigMessage
  | ReportSelectorFailureMessage;
```

### All Service Worker Messages

```typescript
type ServiceWorkerMessage =
  | ExtractionResultMessage
  | ExportProgressMessage
  | ExportCompleteMessage
  | ExportErrorMessage
  | ConfigResultMessage
  | ConfigSavedMessage
  | SelectorUpdateAvailableMessage;
```

### All Popup/Options Messages

```typescript
type PopupMessage =
  | GetConfigMessage
  | SaveConfigMessage
  | GetExportHistoryMessage
  | DismissDonationPromptMessage;
```

---

## Message Validation

All messages MUST be validated using the discriminator pattern:

```typescript
function isValidMessage(msg: unknown): msg is ContentScriptMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    typeof (msg as { type: unknown }).type === 'string'
  );
}

function handleMessage(msg: ContentScriptMessage): void {
  switch (msg.type) {
    case 'EXTRACT_CONVERSATION':
      // TypeScript knows msg.payload has url and title
      break;
    case 'START_EXPORT':
      // TypeScript knows msg.payload has conversation, selectedMessageIds, config
      break;
    // ... etc
  }
}
```

---

## Error Codes

Standard error codes for EXPORT_ERROR messages:

| Code | Description | Recoverable |
|------|-------------|-------------|
| `DOM_EXTRACTION_FAILED` | Could not extract conversation from page | Yes (retry) |
| `NO_MESSAGES_SELECTED` | No messages selected for export | Yes (select messages) |
| `MESSAGE_LIMIT_EXCEEDED` | Conversation exceeds 1000 message limit | No |
| `PDF_GENERATION_FAILED` | jsPDF/html2canvas error | Yes (retry) |
| `STORAGE_ERROR` | chrome.storage operation failed | Yes (retry) |
| `UNKNOWN_FORMAT` | Unsupported export format requested | No |
| `MEMORY_EXCEEDED` | Browser memory limit reached | No (reduce selection) |

