# Research: ChatGPT Conversation Exporter

**Feature**: 001-chatgpt-exporter  
**Date**: 2025-12-03  
**Status**: Complete

## Technology Decisions

### 1. Client-Side PDF Generation

**Decision**: jsPDF + html2canvas

**Rationale**: 
- jsPDF is the most mature client-side PDF library with active maintenance
- html2canvas captures complex DOM including CSS styling, making it ideal for preserving ChatGPT's visual formatting
- Combined approach: render to canvas first, then add to PDF for pixel-perfect output
- No server dependency aligns with privacy requirements (FR-029, FR-030)

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| pdfmake | Less mature CSS/HTML rendering; better for structured data PDFs |
| Puppeteer | Requires server-side Node.js; violates client-side constraint |
| Print-to-PDF browser API | Limited customization; no programmatic control over output |
| pdf-lib | Low-level; requires manual layout; no HTML rendering |

**Implementation Notes**:
- Use html2canvas with `useCORS: true` for any cross-origin images
- Configure jsPDF page dimensions dynamically based on user settings
- For long conversations, implement pagination with canvas splitting

---

### 2. Math Formula Rendering

**Decision**: KaTeX

**Rationale**:
- KaTeX is faster than MathJax (10x+ performance difference)
- ChatGPT already uses KaTeX for its math rendering
- Client-side only, no external dependencies
- Renders to HTML/SVG which html2canvas can capture

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| MathJax | Significantly slower; overkill for export use case |
| Native LaTeX | Requires server-side compilation |
| Screenshot existing | Quality loss; doesn't work for re-rendered content |

**Implementation Notes**:
- Parse LaTeX from ChatGPT's rendered output or raw content
- Re-render with KaTeX for consistent export appearance
- Handle both inline (`$...$`) and block (`$$...$$`) formulas

---

### 3. Code Syntax Highlighting

**Decision**: Prism.js

**Rationale**:
- Lightweight (~2KB core + language packs)
- Supports 300+ languages
- ChatGPT uses similar syntax highlighting; output will match
- CSS-based themes work well with html2canvas

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| highlight.js | Larger bundle size; auto-detection less reliable |
| Shiki | Requires WASM; adds complexity for marginal benefit |
| Raw code extraction | Loses visual formatting; poor user experience |

**Implementation Notes**:
- Bundle only common languages (JS, Python, HTML, CSS, JSON, Bash, SQL)
- Detect language from ChatGPT's code block metadata
- Apply theme consistent with light/dark mode setting

---

### 4. Build Tooling

**Decision**: Vite + CRXJS

**Rationale**:
- Vite provides fast HMR development experience
- CRXJS Vite Plugin handles Manifest V3 complexities automatically
- TypeScript support out of the box
- Tree-shaking produces smaller bundles

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Webpack | Slower builds; more configuration overhead |
| Rollup | Less mature HMR; CRXJS support experimental |
| Parcel | Limited Chrome extension support |
| esbuild alone | No HMR; manual manifest handling |

**Implementation Notes**:
- Use `@crxjs/vite-plugin` for manifest generation
- Configure separate entry points for service worker, content script, popup
- Enable source maps for development only

---

### 5. Testing Strategy

**Decision**: Vitest (unit) + Playwright (E2E)

**Rationale**:
- Vitest is Vite-native; fastest unit test execution
- Playwright has first-class Chrome extension testing support
- Both support TypeScript natively
- Consistent with constitution's testing pyramid requirement

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Jest | Slower; requires additional configuration for ESM |
| Puppeteer | Less ergonomic API; Playwright has better extension support |
| Cypress | No native extension testing; requires workarounds |

**Implementation Notes**:
- Unit tests for exporters, DOM parsers, utility functions
- E2E tests load extension in Chrome, navigate to chatgpt.com, verify export
- Mock ChatGPT page structure for reliable E2E tests

---

### 6. DOM Parsing Strategy

**Decision**: Selector-based extraction with graceful fallback

**Rationale**:
- ChatGPT's DOM is not API-stable; selectors will change
- Isolating selectors in dedicated module enables quick updates
- Multiple selector attempts (primary → fallback) provide resilience
- Aligns with FR-032, FR-033, FR-034 (graceful degradation)

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| ChatGPT API | No official export API; unofficial APIs violate ToS |
| Clipboard interception | Only captures visible content; misses conversation structure |
| Network request interception | Complex; breaks with API changes; potential ToS violation |

**Implementation Notes**:
- Create `selectors.ts` with versioned selector sets
- Implement selector validation on extension load
- Log extraction failures for debugging without exposing user data

---

### 7. State Management

**Decision**: Simple module-level state + chrome.storage

**Rationale**:
- Extension state is minimal (selection state, user preferences)
- No need for Redux/MobX complexity
- chrome.storage.local for persistent preferences
- Module-level state for transient UI state (current selection)

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Redux | Overkill for simple state; adds bundle size |
| Zustand | Unnecessary abstraction for this scope |
| React Context | Not using React for content script UI |

**Implementation Notes**:
- Preferences stored in chrome.storage.local with typed wrapper
- Selection state kept in content script memory (not persisted)
- Service worker coordinates state between contexts via messaging

---

### 8. UI Component Approach

**Decision**: Vanilla TypeScript + CSS (no framework)

**Rationale**:
- Content script UI is minimal (toolbar, checkboxes, dialogs)
- Framework overhead not justified for ~5 components
- Avoids CSS conflicts with ChatGPT's styles via Shadow DOM
- Smaller bundle size; faster injection

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| React | Overkill; adds 40KB+ to content script |
| Preact | Still unnecessary for simple UI |
| Svelte | Compilation complexity for minimal benefit |
| Web Components (Lit) | Considered; vanilla sufficient for scope |

**Implementation Notes**:
- Use Shadow DOM to isolate styles from ChatGPT
- CSS custom properties for theming (light/dark)
- Simple event delegation for interactivity

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| PDF generation approach | jsPDF + html2canvas (client-side) |
| Math rendering | KaTeX (re-render extracted LaTeX) |
| Code highlighting | Prism.js with bundled languages |
| Build tool | Vite + CRXJS plugin |
| Testing | Vitest + Playwright |
| UI framework | None (vanilla TS + Shadow DOM) |

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| ChatGPT DOM changes | Isolated selectors module; graceful fallback; user notification |
| Large conversation performance | Progress indicator; chunked processing; 1000 message limit |
| PDF generation memory | Canvas chunking; lazy rendering; garbage collection hints |
| Bundle size growth | Tree-shaking; code splitting; only bundle used Prism languages |

