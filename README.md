# ChatGPT Exporter

A Chrome extension that exports ChatGPT conversations to PDF, Markdown, Text, JSON, CSV, and Image formats.

## Features

- 📄 **PDF Export** - Beautiful, formatted PDF documents with code highlighting
- 📝 **Multiple Formats** - Markdown, Text, JSON, CSV, and Image export (coming soon)
- ✅ **Selective Export** - Choose specific messages to export (coming soon)
- 🎨 **Customizable** - Dark/light mode, page sizes, fonts, and more (coming soon)
- 🔒 **Privacy First** - All processing happens locally, no data sent to servers
- 🚀 **Manifest V3** - Modern Chrome extension architecture

## Installation

### Development

1. **Prerequisites**
   - Node.js 18+
   - pnpm (recommended) or npm

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

### Production Build

```bash
pnpm build
```

The built extension will be in the `dist/` folder, ready for Chrome Web Store submission.

## Usage

1. Navigate to [chatgpt.com](https://chatgpt.com)
2. Open a conversation
3. Click the **Export** button in the toolbar at the bottom
4. Your PDF will download automatically

## Project Structure

```
src/
├── manifest.json         # Extension manifest (Manifest V3)
├── service-worker/       # Background service worker
├── content/              # Content scripts (injected into ChatGPT)
│   ├── dom/              # DOM parsing utilities
│   └── ui/               # Toolbar and UI components
├── popup/                # Extension popup
├── options/              # Settings page
├── exporters/            # Export format implementations
├── shared/               # Shared utilities
└── types/                # TypeScript type definitions
```

## Development

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with HMR |
| `pnpm build` | Production build |
| `pnpm test` | Run unit tests |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |

### Technology Stack

- **TypeScript** - Type-safe development
- **Vite + CRXJS** - Fast builds with Chrome extension support
- **jsPDF + html2canvas** - Client-side PDF generation
- **KaTeX** - Math formula rendering
- **Prism.js** - Code syntax highlighting

## Privacy

This extension processes all data locally in your browser. Your conversation data is **never** sent to any external server. See our [Privacy Policy](./PRIVACY_POLICY.md) for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

Inspired by [ChatGPT Exporter](https://www.chatgptexporter.com/) - a great tool for exporting ChatGPT conversations.

