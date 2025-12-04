# Tasks: ChatGPT Conversation Exporter

**Input**: Design documents from `/specs/001-chatgpt-exporter/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not explicitly requested - tests are OPTIONAL and not included in this task list.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Chrome Extension single project structure
- Source: `src/` at repository root
- Tests: `tests/` at repository root
- Locales: `_locales/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, build tooling, and basic Chrome extension structure

- [x] T001 Create project structure with directories: src/, tests/, _locales/en/
- [x] T002 Initialize Node.js project with package.json including TypeScript 5.x, Vite, @crxjs/vite-plugin
- [x] T003 [P] Configure TypeScript with tsconfig.json (strict mode enabled)
- [x] T004 [P] Configure Vite with vite.config.ts for Chrome extension (CRXJS plugin)
- [x] T005 [P] Configure ESLint and Prettier in .eslintrc.js and .prettierrc
- [x] T006 Create Manifest V3 configuration in src/manifest.json with permissions: activeTab, storage, host_permissions for chatgpt.com
- [x] T007 [P] Create _locales/en/messages.json with initial i18n strings for extension name and description

**Checkpoint**: Build tooling ready, `pnpm dev` produces loadable extension

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Shared Types & Interfaces

- [x] T008 [P] Create src/types/index.d.ts with Conversation, Message, ContentBlock union types from data-model.md
- [x] T009 [P] Create src/types/index.d.ts with ExportConfig, ExportJob, ExportStatus, ExportFormat types
- [x] T010 [P] Create src/types/index.d.ts with SelectionState and LatexExpression types

### Message Passing Infrastructure

- [x] T011 Create src/shared/messages.ts with typed message schemas from contracts/messages.md (ContentScriptMessage, ServiceWorkerMessage union types)
- [x] T012 Create src/shared/messages.ts with message validation function isValidMessage()

### Storage Infrastructure

- [x] T013 Create src/shared/storage.ts with typed chrome.storage.local wrapper for ExportConfig
- [x] T014 Create src/shared/storage.ts with getConfig(), saveConfig(), getDefaultConfig() functions
- [x] T015 Create src/shared/config.ts with DEFAULT_EXPORT_CONFIG constant matching data-model.md defaults

### Service Worker Foundation

- [x] T016 Create src/service-worker/index.ts entry point with chrome.runtime.onMessage listener
- [x] T017 Create src/service-worker/handlers/config.ts with GET_CONFIG and SAVE_CONFIG message handlers
- [x] T018 [P] Create src/service-worker/handlers/index.ts to aggregate all message handlers

### Content Script Foundation

- [x] T019 Create src/content/index.ts entry point that detects chatgpt.com conversation pages
- [x] T020 Create src/content/dom/selectors.ts with ChatGPT DOM selectors (isolated for easy updates)
- [x] T021 Create src/content/dom/types.ts with DOM extraction result types

### i18n Foundation

- [x] T022 Create src/shared/i18n.ts with getMessage() wrapper for chrome.i18n API
- [x] T023 Update _locales/en/messages.json with UI strings: toolbar buttons, menu items, error messages

**Checkpoint**: Foundation ready - message passing works, storage works, content script loads on chatgpt.com

---

## Phase 3: User Story 1 - Quick Export to PDF (Priority: P1) 🎯 MVP

**Goal**: User can click Export button and download a PDF of the full conversation with proper formatting

**Independent Test**: Open any ChatGPT conversation → Click Export → PDF downloads with full conversation, code blocks preserved, user/assistant messages distinguishable

### DOM Extraction (US1)

- [x] T024 [P] [US1] Create src/content/dom/parser.ts with extractConversation() function returning Conversation type
- [x] T025 [P] [US1] Create src/content/dom/parser.ts with extractMessages() function returning Message[] array
- [x] T026 [US1] Create src/content/dom/parser.ts with parseContentBlocks() function handling TextBlock, CodeBlock, TableBlock types
- [x] T027 [US1] Add graceful fallback in parser.ts when selectors fail (FR-032, FR-033, FR-034)

### Toolbar UI (US1)

- [x] T028 [P] [US1] Create src/content/ui/styles.css with toolbar styles using Shadow DOM isolation
- [x] T029 [US1] Create src/content/ui/toolbar.ts with floating toolbar component (Export button only for MVP)
- [x] T030 [US1] Implement toolbar injection at bottom of ChatGPT conversation page in src/content/index.ts
- [x] T031 [US1] Add toolbar visibility logic: show only on conversation pages (FR-003)

### PDF Exporter (US1)

- [x] T032 [P] [US1] Create src/exporters/types.ts with Exporter interface and ExportResult type
- [x] T033 [US1] Create src/exporters/pdf.ts with PdfExporter class using jsPDF + html2canvas
- [x] T034 [US1] Implement renderConversationToCanvas() in pdf.ts for full conversation rendering
- [x] T035 [US1] Implement visual distinction between user/assistant messages in pdf.ts (FR-026)
- [x] T036 [US1] Implement code block rendering with Prism.js syntax highlighting in pdf.ts (FR-022)
- [x] T037 [US1] Implement table rendering in pdf.ts preserving structure (FR-023)

### Export Flow (US1)

- [x] T038 [US1] Create src/service-worker/handlers/export.ts with START_EXPORT message handler
- [x] T039 [US1] Implement export job state machine in export.ts (pending → extracting → rendering → generating → completed)
- [x] T040 [US1] Implement file download trigger using blob URL in export.ts
- [x] T041 [US1] Wire Export button click → extractConversation → START_EXPORT → PDF download flow

### Progress & Error Handling (US1)

- [x] T042 [US1] Implement EXPORT_PROGRESS messages in export.ts for long conversations (FR-042)
- [x] T043 [US1] Create src/content/ui/progress.ts with progress indicator component
- [x] T044 [US1] Implement error handling with EXPORT_ERROR messages and user-friendly display

**Checkpoint**: User Story 1 complete - PDF export works end-to-end for any conversation

---

## Phase 4: User Story 2 - Selective Content Export (Priority: P2)

**Goal**: User can select All/Questions/Answers/None or individual messages via checkboxes before export

**Independent Test**: Select "Questions only" → Export → Only user prompts appear in PDF

### Selection State Management (US2)

- [ ] T045 [P] [US2] Create src/content/selection/state.ts with SelectionState management (mode, selectedIds)
- [ ] T046 [US2] Implement selection mode handlers: setMode('all' | 'questions' | 'answers' | 'none' | 'custom')
- [ ] T047 [US2] Implement getSelectedMessages() filtering logic based on current mode

### Selection UI Components (US2)

- [ ] T048 [P] [US2] Create src/content/ui/checkbox.ts with message checkbox component
- [ ] T049 [US2] Implement checkbox injection next to each message in conversation (FR-006)
- [ ] T050 [US2] Create src/content/ui/toolbar.ts Select button with dropdown menu (All, Questions, Answers, None)
- [ ] T051 [US2] Implement master checkbox for select-all/deselect-all (FR-008)
- [ ] T052 [US2] Add visual feedback: selected messages highlighted, count displayed

### Selection Integration (US2)

- [ ] T053 [US2] Update START_EXPORT payload to include selectedMessageIds array
- [ ] T054 [US2] Update pdf.ts to render only selected messages
- [ ] T055 [US2] Handle edge case: no messages selected → show error (NO_MESSAGES_SELECTED)

**Checkpoint**: User Story 2 complete - Selective export works with all selection modes

---

## Phase 5: User Story 3 - Multiple Export Formats (Priority: P2)

**Goal**: User can export to Markdown, JSON, CSV, Text, or Image in addition to PDF

**Independent Test**: Export same conversation to each format → Each produces valid, openable file

### Export Format Menu (US3)

- [ ] T056 [US3] Update src/content/ui/toolbar.ts Export button with dropdown: PDF, Markdown, Text, JSON, CSV, Image
- [ ] T057 [US3] Store last used format in chrome.storage and use as default

### Markdown Exporter (US3)

- [ ] T058 [P] [US3] Create src/exporters/markdown.ts with MarkdownExporter class
- [ ] T059 [US3] Implement conversation-to-markdown conversion with headings, code blocks, lists

### JSON Exporter (US3)

- [ ] T060 [P] [US3] Create src/exporters/json.ts with JsonExporter class
- [ ] T061 [US3] Implement structured JSON output with messages, roles, timestamps, content blocks

### CSV Exporter (US3)

- [ ] T062 [P] [US3] Create src/exporters/csv.ts with CsvExporter class
- [ ] T063 [US3] Implement CSV output with columns: role, content, timestamp

### Text Exporter (US3)

- [ ] T064 [P] [US3] Create src/exporters/text.ts with TextExporter class
- [ ] T065 [US3] Implement plain text output with clear message separation

### Image Exporter (US3)

- [ ] T066 [P] [US3] Create src/exporters/image.ts with ImageExporter class using html2canvas
- [ ] T067 [US3] Implement full conversation capture as PNG image

### Exporter Integration (US3)

- [ ] T068 [US3] Create src/exporters/index.ts factory function getExporter(format: ExportFormat)
- [ ] T069 [US3] Update export.ts handler to use format from config and route to correct exporter

**Checkpoint**: User Story 3 complete - All 6 export formats work

---

## Phase 6: User Story 4 - Customizable PDF Settings (Priority: P3)

**Goal**: User can configure PDF output: filename, page size, margins, fonts, dark mode, TOC, page breaks

**Independent Test**: Configure A4 Landscape + Dark Mode + TOC → PDF uses those exact settings

### PDF Configuration Dialog (US4)

- [ ] T070 [P] [US4] Create src/content/ui/dialogs/pdf-config.ts dialog component structure
- [ ] T071 [US4] Implement File Name and Content Title input fields (FR-012)
- [ ] T072 [US4] Implement Page Format dropdowns: paper size (A4/Letter/Legal), orientation (Portrait/Landscape) (FR-013)
- [ ] T073 [US4] Implement Page Margin dropdown: Normal/Narrow/Wide (FR-014)
- [ ] T074 [US4] Implement Dark Mode toggle (FR-015)
- [ ] T075 [US4] Implement Font Size slider/input (percentage) (FR-016)
- [ ] T076 [US4] Implement Font selection dropdown (FR-017)
- [ ] T077 [US4] Implement User Info section: Name/Email checkboxes with input fields (FR-018)
- [ ] T078 [US4] Implement Date & Time section: visibility toggle, format dropdowns (FR-019)
- [ ] T079 [US4] Implement Layout toggles: Page Numbers, Icons, TOC, Page Break Per Prompt (FR-020)
- [ ] T080 [US4] Implement Generate button with Enter key support (FR-021)

### PDF Exporter Enhancements (US4)

- [ ] T081 [US4] Update pdf.ts to apply pageSize and orientation from config
- [ ] T082 [US4] Update pdf.ts to apply margin settings from config
- [ ] T083 [US4] Implement dark mode rendering in pdf.ts (dark background, light text)
- [ ] T084 [US4] Implement font size scaling in pdf.ts
- [ ] T085 [US4] Implement Table of Contents generation in pdf.ts
- [ ] T086 [US4] Implement page break per prompt in pdf.ts
- [ ] T087 [US4] Implement page numbers in pdf.ts (optional via config)
- [ ] T088 [US4] Implement user info header in pdf.ts (name, email, date/time)

### Settings Persistence (US4)

- [ ] T089 [US4] Update storage.ts to persist full ExportConfig on dialog close
- [ ] T090 [US4] Load saved config when dialog opens (FR-027)

**Checkpoint**: User Story 4 complete - All PDF configuration options work

---

## Phase 7: User Story 5 - Preserve Advanced ChatGPT Outputs (Priority: P3)

**Goal**: Export preserves LaTeX math, code with syntax highlighting, tables, and thinking process blocks

**Independent Test**: Export conversation with math formulas + code + tables + thinking → All render correctly in PDF

### Math Formula Handling (US5)

- [ ] T091 [P] [US5] Update src/content/dom/parser.ts to detect and extract LaTeX expressions (inline $ and block $$)
- [ ] T092 [US5] Create src/shared/latex.ts with KaTeX rendering utilities
- [ ] T093 [US5] Update pdf.ts to render LaTeX formulas using KaTeX (FR-024)

### Enhanced Code Block Handling (US5)

- [ ] T094 [US5] Update parser.ts to extract language metadata from ChatGPT code blocks
- [ ] T095 [US5] Configure Prism.js with common languages: JS, Python, HTML, CSS, JSON, Bash, SQL, TypeScript
- [ ] T096 [US5] Update pdf.ts to render syntax-highlighted code blocks (FR-022)

### Table Handling (US5)

- [ ] T097 [US5] Update parser.ts to extract TableBlock with headers and rows
- [ ] T098 [US5] Update pdf.ts to render tables with proper alignment and borders (FR-023)

### Thinking Process Blocks (US5)

- [ ] T099 [US5] Update parser.ts to detect and extract ThinkingBlock content
- [ ] T100 [US5] Update pdf.ts to render thinking blocks with visual distinction (collapsed/expandable style) (FR-025)

### Cross-Format Support (US5)

- [ ] T101 [US5] Update markdown.ts to preserve LaTeX, code blocks, tables in output
- [ ] T102 [US5] Update json.ts to include content block types with metadata
- [ ] T103 [US5] Update text.ts to format code blocks and tables as ASCII

**Checkpoint**: User Story 5 complete - All advanced ChatGPT content types export correctly

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, edge cases, and final polish

### Conversation Limits (Cross-cutting)

- [ ] T104 Implement 500+ message warning in src/content/ui/dialogs/warning.ts (FR-040)
- [ ] T105 Implement 1000 message hard limit with error in export.ts (FR-041)
- [ ] T106 Implement progress indicator for 100+ message exports (FR-042)

### Popup & Options Pages

- [ ] T107 [P] Create src/popup/index.html with basic popup structure
- [ ] T108 [P] Create src/popup/popup.ts with quick export status and settings link
- [ ] T109 [P] Create src/options/index.html with full settings page structure
- [ ] T110 Create src/options/options.ts with export preferences management (FR-028)

### Donation Prompt

- [ ] T111 Create src/content/ui/dialogs/donation.ts with dismissible donation prompt (FR-036, FR-037)
- [ ] T112 Implement donation prompt dismissal logic with permanent option (FR-038)
- [ ] T113 Update storage.ts with donationPromptDismissed and donationPromptLastShown fields

### Accessibility & i18n

- [ ] T114 Add ARIA labels and keyboard navigation to toolbar and dialogs (WCAG 2.1 AA)
- [ ] T115 Ensure all user-facing strings use chrome.i18n.getMessage()
- [ ] T116 Update _locales/en/messages.json with complete string coverage

### Edge Cases & Resilience

- [ ] T117 Handle export during ChatGPT response generation (wait or export available)
- [ ] T118 Implement graceful degradation notification UI when DOM extraction partially fails
- [ ] T119 Add retry mechanism for recoverable export errors

### Documentation

- [ ] T120 [P] Create README.md with installation, usage, and development instructions
- [ ] T121 Run quickstart.md validation: verify dev setup, build, and test commands work

**Checkpoint**: Extension fully polished and ready for Chrome Web Store submission

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 - MVP milestone
- **Phase 4 (US2)**: Depends on Phase 2 (can parallel with US1 after foundation)
- **Phase 5 (US3)**: Depends on Phase 2 (can parallel with US1/US2 after foundation)
- **Phase 6 (US4)**: Depends on US1 (enhances PDF exporter)
- **Phase 7 (US5)**: Depends on US1 (enhances content parsing and PDF rendering)
- **Phase 8 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 2 (Foundation)
       │
       ├──→ US1 (P1) ──→ US4 (P3) ──→ US5 (P3)
       │                    │            │
       ├──→ US2 (P2) ──────┴────────────┘
       │
       └──→ US3 (P2)
```

- **US1 (P1)**: Foundation only - no story dependencies
- **US2 (P2)**: Foundation only - can parallel with US1
- **US3 (P2)**: Foundation only - can parallel with US1/US2
- **US4 (P3)**: Depends on US1 PDF exporter
- **US5 (P3)**: Depends on US1 parser and PDF exporter

### Parallel Opportunities Within Phases

**Phase 2 Parallel**:
```
T008, T009, T010 (all type definitions)
T018 (handler aggregation)
T022 + T023 (i18n)
```

**Phase 3 (US1) Parallel**:
```
T024, T025 (parser functions)
T028 (styles)
T032 (exporter types)
```

**Phase 5 (US3) Parallel**:
```
T058, T060, T062, T064, T066 (all exporter classes)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T023)
3. Complete Phase 3: User Story 1 (T024-T044)
4. **STOP and VALIDATE**: Load extension, open ChatGPT, click Export, verify PDF downloads
5. Deploy to Chrome Web Store as v1.0.0-beta

### Incremental Delivery

| Version | User Stories | Key Capability |
|---------|--------------|----------------|
| v1.0.0 | US1 | PDF export (MVP) |
| v1.1.0 | US1 + US2 | Selective export |
| v1.2.0 | US1 + US2 + US3 | All 6 formats |
| v2.0.0 | All stories | Full customization + advanced content |

### Parallel Team Strategy

With 2+ developers after Phase 2:
- Developer A: US1 (PDF export core)
- Developer B: US2 (Selection UI) or US3 (Format exporters)

After US1 complete:
- Developer A: US4 + US5 (PDF enhancements)
- Developer B: US3 (remaining formats) → Phase 8 (polish)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [USn] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

