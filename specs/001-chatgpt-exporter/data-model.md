# Data Model: ChatGPT Conversation Exporter

**Feature**: 001-chatgpt-exporter  
**Date**: 2025-12-03  
**Status**: Complete

## Entity Overview

```
┌─────────────────┐     ┌─────────────────┐
│  Conversation   │────<│     Message     │
└─────────────────┘     └─────────────────┘
                              │
                              │ contains
                              ▼
                        ┌─────────────────┐
                        │  ContentBlock   │
                        └─────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
      ┌──────────┐    ┌──────────────┐   ┌──────────┐
      │TextBlock │    │  CodeBlock   │   │TableBlock│
      └──────────┘    └──────────────┘   └──────────┘

┌─────────────────┐     ┌─────────────────┐
│ExportConfig     │     │   ExportJob     │
└─────────────────┘     └─────────────────┘
```

## Core Entities

### Conversation

Represents a complete ChatGPT chat session extracted from the page.

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| id | string | Unique identifier (from URL) | URL path segment |
| title | string | Conversation title | Page title / first message |
| url | string | Full URL to conversation | window.location.href |
| createdAt | Date \| null | Creation timestamp | DOM metadata if available |
| messages | Message[] | Ordered list of messages | DOM extraction |
| messageCount | number | Total number of messages | Computed |

**Validation Rules**:
- `id` must be non-empty string
- `url` must be valid chatgpt.com URL
- `messages` must have at least 1 message for export

---

### Message

An individual exchange unit in the conversation.

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| id | string | Unique identifier within conversation | DOM element ID or generated |
| index | number | Order position (0-based) | Extraction order |
| role | 'user' \| 'assistant' | Who authored the message | DOM structure |
| content | ContentBlock[] | Structured content blocks | Parsed from message body |
| rawHtml | string | Original HTML for fallback | DOM innerHTML |
| timestamp | Date \| null | When message was sent | DOM if available |
| isSelected | boolean | Selection state for export | UI state |

**Validation Rules**:
- `role` must be exactly 'user' or 'assistant'
- `content` array can be empty (for image-only messages)
- `isSelected` defaults to `true`

---

### ContentBlock (Union Type)

Polymorphic content within a message. Discriminated union by `type` field.

#### TextBlock

| Field | Type | Description |
|-------|------|-------------|
| type | 'text' | Discriminator |
| content | string | Plain text or markdown |
| hasLatex | boolean | Contains math formulas |
| latexExpressions | LatexExpression[] | Extracted formulas |

#### CodeBlock

| Field | Type | Description |
|-------|------|-------------|
| type | 'code' | Discriminator |
| language | string \| null | Programming language |
| content | string | Code text |
| filename | string \| null | Associated filename if present |

#### TableBlock

| Field | Type | Description |
|-------|------|-------------|
| type | 'table' | Discriminator |
| headers | string[] | Column headers |
| rows | string[][] | Table data rows |

#### ImageBlock

| Field | Type | Description |
|-------|------|-------------|
| type | 'image' | Discriminator |
| src | string | Image source URL |
| alt | string | Alt text |
| isGenerated | boolean | AI-generated vs user-uploaded |

#### ThinkingBlock

| Field | Type | Description |
|-------|------|-------------|
| type | 'thinking' | Discriminator |
| content | string | Thinking process text |
| isCollapsed | boolean | Display state in original |

---

### LatexExpression

Extracted mathematical formula.

| Field | Type | Description |
|-------|------|-------------|
| raw | string | Original LaTeX string |
| isBlock | boolean | Block ($$) vs inline ($) |
| position | number | Character offset in parent text |

---

### ExportConfig

User preferences for export operations. Persisted to chrome.storage.local.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| format | ExportFormat | 'pdf' | Selected export format |
| filename | string | '{title}' | Filename template |
| contentTitle | string | '{title}' | Document title |
| **PDF Settings** | | | |
| pageSize | 'a4' \| 'letter' \| 'legal' | 'a4' | Paper size |
| orientation | 'portrait' \| 'landscape' | 'portrait' | Page orientation |
| margin | 'normal' \| 'narrow' \| 'wide' | 'normal' | Page margins |
| darkMode | boolean | false | Dark theme |
| fontSize | number | 100 | Font size percentage |
| fontFamily | string | 'default' | Font selection |
| **Content Options** | | | |
| includeUserInfo | boolean | false | Show name/email |
| userName | string | '' | User name if enabled |
| userEmail | string | '' | User email if enabled |
| showDateTime | boolean | false | Include timestamps |
| dateFormat | string | 'MM/DD/YYYY' | Date format string |
| timeFormat | '12h' \| '24h' | '24h' | Time format |
| **Layout Options** | | | |
| showPageNumbers | boolean | true | Include page numbers |
| showIcons | boolean | true | Show role icons |
| includeTableOfContents | boolean | false | Generate TOC |
| pageBreakPerPrompt | boolean | false | New page per exchange |
| **Misc** | | | |
| showDonationPrompt | boolean | true | Show donation prompt |

**Type**: ExportFormat = 'pdf' \| 'markdown' \| 'text' \| 'json' \| 'csv' \| 'image'

---

### ExportJob

Tracks a single export operation.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique job identifier |
| conversationId | string | Source conversation |
| format | ExportFormat | Target format |
| config | ExportConfig | Applied configuration |
| selectedMessageIds | string[] | Messages to export |
| status | ExportStatus | Current state |
| progress | number | 0-100 percentage |
| error | string \| null | Error message if failed |
| startedAt | Date | Job start time |
| completedAt | Date \| null | Job completion time |

**Type**: ExportStatus = 'pending' \| 'extracting' \| 'rendering' \| 'generating' \| 'completed' \| 'failed'

**State Transitions**:
```
pending → extracting → rendering → generating → completed
    │         │            │            │
    └─────────┴────────────┴────────────┴──→ failed
```

---

### SelectionState

Transient UI state for message selection (not persisted).

| Field | Type | Description |
|-------|------|-------------|
| mode | 'all' \| 'questions' \| 'answers' \| 'none' \| 'custom' | Selection mode |
| selectedIds | Set<string> | Explicitly selected message IDs |
| conversationId | string | Current conversation |

---

## Storage Schema

### chrome.storage.local

```typescript
interface StorageSchema {
  // User preferences (persisted)
  exportConfig: ExportConfig;
  
  // Extension state
  lastExportFormat: ExportFormat;
  donationPromptDismissed: boolean;
  donationPromptLastShown: number; // timestamp
  
  // Selector versioning (for graceful degradation)
  selectorVersion: string;
  lastSuccessfulExtraction: number; // timestamp
}
```

### chrome.storage.session

```typescript
interface SessionSchema {
  // Transient state (cleared on browser close)
  currentExportJob: ExportJob | null;
}
```

---

## Relationships

| From | To | Cardinality | Description |
|------|-----|-------------|-------------|
| Conversation | Message | 1:N | Conversation contains messages |
| Message | ContentBlock | 1:N | Message contains content blocks |
| ExportJob | Conversation | N:1 | Job exports one conversation |
| ExportJob | Message | N:M | Job includes selected messages |
| ExportJob | ExportConfig | 1:1 | Job uses one configuration |

---

## Indexes / Lookups

For efficient DOM-to-model mapping:

| Lookup | Key | Value | Purpose |
|--------|-----|-------|---------|
| messageByElement | WeakMap<Element, Message> | Message | Map DOM elements to extracted messages |
| messageById | Map<string, Message> | Message | Fast message lookup by ID |

---

## Validation Summary

| Entity | Required Fields | Constraints |
|--------|-----------------|-------------|
| Conversation | id, url, messages | messages.length >= 1 |
| Message | id, index, role | role ∈ {'user', 'assistant'} |
| ExportConfig | format | fontSize ∈ [50, 200] |
| ExportJob | id, conversationId, format, status | progress ∈ [0, 100] |

