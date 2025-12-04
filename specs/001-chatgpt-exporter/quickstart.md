# Quickstart: ChatGPT Conversation Exporter

**Feature**: 001-chatgpt-exporter  
**Date**: 2025-12-03

## Prerequisites

- **Node.js**: 18.x or higher
- **pnpm**: 8.x or higher (recommended) or npm 9.x
- **Chrome**: 116 or higher (for testing)
- **Git**: 2.x or higher

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to project root
cd gpt_pdf_extension

# Install dependencies
pnpm install
```

### 2. Project Initialization (First Time Only)

```bash
# Initialize the Chrome extension project structure
pnpm create vite . --template vanilla-ts

# Install Chrome extension tooling
pnpm add -D @crxjs/vite-plugin@beta

# Install core dependencies
pnpm add jspdf html2canvas katex prismjs

# Install dev dependencies
pnpm add -D vitest @vitest/ui playwright @playwright/test
pnpm add -D @types/chrome @types/katex @types/prismjs
```

### 3. Configure Vite for Chrome Extension

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
      },
    },
  },
});
```

## Development Workflow

### Start Development Server

```bash
# Start Vite dev server with HMR
pnpm dev
```

This will:
- Build the extension to `dist/`
- Watch for file changes
- Enable Hot Module Replacement for popup/options pages

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist/` folder in your project

The extension will auto-reload when you make changes (HMR).

### Manual Reload (if needed)

If HMR doesn't pick up changes (especially for service worker or content scripts):
1. Go to `chrome://extensions/`
2. Click the refresh icon on your extension card

## Testing

### Run Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui
```

### Run E2E Tests

```bash
# Install Playwright browsers (first time)
pnpm exec playwright install chromium

# Run E2E tests
pnpm test:e2e
```

### Test on ChatGPT

1. Ensure extension is loaded (see above)
2. Navigate to [chatgpt.com](https://chatgpt.com)
3. Open or create a conversation
4. Verify toolbar appears at bottom of page
5. Test export functionality

## Build for Production

```bash
# Create production build
pnpm build

# Output will be in dist/
# Ready for Chrome Web Store submission
```

### Package for Chrome Web Store

```bash
# Create ZIP for submission
cd dist && zip -r ../chatgpt-exporter.zip . && cd ..
```

## Project Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with HMR |
| `pnpm build` | Production build |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:ui` | Run tests with Vitest UI |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |

## Directory Structure

```
gpt_pdf_extension/
├── src/
│   ├── manifest.json        # Extension manifest (Manifest V3)
│   ├── service-worker/      # Background service worker
│   ├── content/             # Content scripts
│   ├── popup/               # Popup UI
│   ├── options/             # Options page
│   ├── exporters/           # Export format modules
│   └── shared/              # Shared utilities
├── tests/
│   ├── unit/                # Vitest unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # Playwright E2E tests
├── _locales/                # i18n strings
├── dist/                    # Build output (git-ignored)
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Common Issues

### Extension Not Loading

- Ensure `dist/` folder exists (run `pnpm dev` or `pnpm build`)
- Check for manifest.json errors in `chrome://extensions/`
- Verify no syntax errors in TypeScript files

### Content Script Not Injecting

- Check that you're on `chatgpt.com` (not `chat.openai.com`)
- Verify manifest host permissions include `*://chatgpt.com/*`
- Reload the ChatGPT page after loading extension

### HMR Not Working

- Content scripts require manual page refresh
- Service worker changes require extension reload
- Popup/options pages support full HMR

### TypeScript Errors

```bash
# Check for type errors
pnpm typecheck

# If @types/chrome is missing
pnpm add -D @types/chrome
```

## Debugging

### Service Worker

1. Go to `chrome://extensions/`
2. Find your extension
3. Click **Inspect views: service worker**
4. Use DevTools Console/Sources for debugging

### Content Script

1. Open ChatGPT in Chrome
2. Open DevTools (F12)
3. Go to Sources > Content scripts
4. Find your extension's content script

### Popup

1. Click extension icon to open popup
2. Right-click popup → Inspect
3. Use DevTools for debugging

## Next Steps

After setup, proceed to implement features in priority order:

1. **P1**: PDF Export (User Story 1)
2. **P2**: Selective Export (User Story 2)
3. **P2**: Multiple Formats (User Story 3)
4. **P3**: PDF Customization (User Story 4)
5. **P3**: Advanced Content (User Story 5)

See [tasks.md](./tasks.md) for detailed implementation tasks.

