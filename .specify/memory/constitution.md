<!--
====================================================================
SYNC IMPACT REPORT
====================================================================
Version change: (none) → 1.0.0
Modified principles: N/A (initial constitution)
Added sections:
  - Core Principles (5 principles)
  - Chrome Extension Constraints
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ compatible (generic structure)
  - .specify/templates/spec-template.md ✅ compatible (generic structure)
  - .specify/templates/tasks-template.md ✅ compatible (generic structure)
Follow-up TODOs: None
====================================================================
-->

# GPT PDF Extension Constitution

## Core Principles

### I. Manifest V3 Compliance

All extension development MUST target Chrome Manifest V3 exclusively. Service workers
replace persistent background pages. Dynamic script injection MUST use
`chrome.scripting` API. Remote code execution is forbidden—all logic MUST be bundled
at build time.

**Rationale**: Manifest V3 is Chrome's current extension platform standard. Extensions
using deprecated Manifest V2 will be disabled. Early compliance ensures long-term
viability and Chrome Web Store acceptance.

### II. Minimal Permissions

The extension MUST request only permissions essential for core functionality.
Optional permissions MUST be used for features that users can enable on-demand.
Host permissions MUST be scoped to specific domains rather than broad patterns like
`<all_urls>` unless absolutely required. Every permission MUST be justified in
documentation.

**Rationale**: Users and the Chrome Web Store scrutinize permission requests.
Excessive permissions erode trust and may trigger manual review delays. Minimal
permissions reduce attack surface.

### III. User Privacy First

PDF content and user queries MUST NOT be persisted beyond the active session unless
the user explicitly opts in. Data sent to external AI services MUST be disclosed
transparently. Local processing MUST be preferred over cloud transmission where
feasible. The extension MUST NOT collect telemetry without explicit consent.

**Rationale**: Users handle sensitive documents. Trust is foundational for adoption.
Privacy regulations (GDPR, CCPA) impose legal obligations on data handling.

### IV. Secure Communication

All external API calls MUST use HTTPS. API keys MUST NOT be hardcoded in source
files—use secure storage (`chrome.storage.session` for sensitive tokens) or prompt
user configuration. Content Security Policy (CSP) MUST be enforced in the manifest.
Message passing between content scripts and service workers MUST validate origins.

**Rationale**: Extensions operate with elevated privileges. Compromised extensions
can access browser data across sites. Defense in depth prevents exploitation.

### V. Modular Architecture

The codebase MUST maintain clear separation between: (1) service worker (background
logic), (2) content scripts (DOM interaction), (3) popup/options UI, and
(4) shared utilities. Each module MUST be independently testable. Cross-module
communication MUST use Chrome's messaging APIs with typed message schemas.

**Rationale**: Chrome extensions enforce execution context boundaries. Clean
separation simplifies debugging, testing, and feature evolution. Typed messaging
prevents runtime errors from unstructured data.

## Chrome Extension Constraints

- **Chrome Web Store Compliance**: All releases MUST pass Chrome Web Store automated
  and manual review. Single-purpose policy MUST be followed—the extension does one
  thing well.
- **Performance Budget**: Service worker startup MUST complete in <500ms. Content
  script injection MUST NOT block page load. Memory usage SHOULD stay under 50MB
  during typical operation.
- **Offline Capability**: Core PDF viewing/interaction features SHOULD function
  without network connectivity. AI-dependent features MUST degrade gracefully with
  clear user messaging when offline.
- **Accessibility**: UI components MUST meet WCAG 2.1 AA standards. Keyboard
  navigation MUST be fully supported. Screen reader compatibility MUST be verified.
- **Internationalization**: User-facing strings MUST use Chrome's i18n API
  (`chrome.i18n`) from the start to support future localization.

## Development Workflow

- **Version Control**: Semantic versioning (MAJOR.MINOR.PATCH) aligned with
  manifest `version` field. Every Chrome Web Store submission increments version.
- **Testing Pyramid**: Unit tests for utilities and business logic. Integration
  tests for message passing flows. Manual testing checklist for UI and browser
  interactions. E2E tests using Puppeteer or Playwright for critical user journeys.
- **Build Process**: TypeScript compilation with strict mode. Bundling via Vite,
  Webpack, or similar. Source maps generated for development. Production builds
  minified without source maps.
- **Code Review**: All changes require PR review before merge. Security-sensitive
  changes (permissions, CSP, API handling) require additional reviewer sign-off.
- **Release Process**: Test in unpacked mode → Package as .zip → Submit to Chrome
  Web Store → Monitor review status → Staged rollout for major versions.

## Governance

This constitution supersedes all other development practices for this project.
Amendments require:

1. Documented rationale for the change
2. Review of impact on existing code and templates
3. Version increment following semantic versioning:
   - **MAJOR**: Principle removal or fundamental redefinition
   - **MINOR**: New principle or significant expansion
   - **PATCH**: Clarification or wording refinement
4. Update to this file with new version and amendment date

All pull requests and code reviews MUST verify compliance with these principles.
Violations MUST be resolved before merge. Complexity beyond these principles MUST
be justified in writing with rejected alternatives documented.

**Version**: 1.0.0 | **Ratified**: 2025-12-03 | **Last Amended**: 2025-12-03
