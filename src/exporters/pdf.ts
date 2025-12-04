// ============================================================================
// PDF Exporter
// Exports conversation to PDF using jsPDF + html2canvas
// ============================================================================

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import type { Conversation, Message, ExportConfig, ContentBlock } from '../types/index.d.ts';
import type { Exporter, ExportResult, ProgressCallback, PdfExportOptions } from './types';
import { PAGE_DIMENSIONS, MARGIN_VALUES } from '../shared/config';
import { processTextWithLatex, containsLatex, getKatexStyles } from '../shared/latex';

// ============================================================================
// PDF Exporter Class
// ============================================================================

export class PdfExporter implements Exporter {
  format = 'pdf' as const;
  private options: PdfExportOptions;

  constructor(options: PdfExportOptions = {}) {
    this.options = {
      debug: false,
      imageQuality: 0.95,
      scale: 2,
      maxWidth: 1200,
      ...options,
    };
  }

  getFileExtension(): string {
    return 'pdf';
  }

  getMimeType(): string {
    return 'application/pdf';
  }

  async export(
    conversation: Conversation,
    messages: Message[],
    config: ExportConfig,
    onProgress?: ProgressCallback
  ): Promise<ExportResult> {
    try {
      onProgress?.(0);

      // Create PDF document
      const { pageSize, orientation } = config;
      const dimensions = PAGE_DIMENSIONS[pageSize];
      const margins = MARGIN_VALUES[config.margin];

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: [dimensions.width, dimensions.height],
      });

      onProgress?.(10);

      // Create temporary container for rendering
      const container = this.createRenderContainer(config);
      document.body.appendChild(container);

      try {
        // Render conversation content to container
        this.renderConversationToContainer(container, conversation, messages, config);
        onProgress?.(30);

        // Capture as canvas
        const canvas = await html2canvas(container, {
          scale: this.options.scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: config.darkMode ? '#1a1a1a' : '#ffffff',
          logging: this.options.debug,
        });

        onProgress?.(60);

        // Calculate dimensions
        const pageWidth = dimensions.width - margins.left - margins.right;
        const pageHeight = dimensions.height - margins.top - margins.bottom;

        // Calculate scaling to fit width
        const scaleFactor = pageWidth / (canvas.width / this.options.scale!);
        const scaledHeight = (canvas.height / this.options.scale!) * scaleFactor;

        // Calculate how many pages we need
        const totalPages = Math.ceil(scaledHeight / pageHeight);

        onProgress?.(70);

        // For each page, create a cropped portion of the canvas
        for (let pageNum = 0; pageNum < totalPages; pageNum++) {
          if (pageNum > 0) {
            pdf.addPage();
          }

          // Calculate the portion of the source canvas for this page
          const sourceY = (pageNum * pageHeight / scaleFactor) * this.options.scale!;
          const sourceHeight = Math.min(
            (pageHeight / scaleFactor) * this.options.scale!,
            canvas.height - sourceY
          );

          // Create a temporary canvas for this page's content
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;

          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            // Fill background
            ctx.fillStyle = config.darkMode ? '#1a1a1a' : '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

            // Draw the portion of the original canvas
            ctx.drawImage(
              canvas,
              0, sourceY,                    // Source x, y
              canvas.width, sourceHeight,    // Source width, height
              0, 0,                          // Destination x, y
              canvas.width, sourceHeight     // Destination width, height
            );
          }

          // Add this page's image to the PDF
          const pageImgData = pageCanvas.toDataURL('image/jpeg', this.options.imageQuality);
          const actualHeight = (sourceHeight / this.options.scale!) * scaleFactor;

          pdf.addImage(
            pageImgData,
            'JPEG',
            margins.left,
            margins.top,
            pageWidth,
            actualHeight
          );

          onProgress?.(70 + Math.min(20, ((pageNum + 1) / totalPages) * 20));
        }

        // Add page numbers if enabled
        if (config.showPageNumbers) {
          this.addPageNumbers(pdf, config);
        }

        onProgress?.(95);

        // Generate blob
        const blob = pdf.output('blob');

        onProgress?.(100);

        return {
          success: true,
          blob,
          mimeType: this.getMimeType(),
          byteSize: blob.size,
        };
      } finally {
        // Clean up
        document.body.removeChild(container);
      }
    } catch (error) {
      console.error('PDF export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during PDF export',
      };
    }
  }

  // ============================================================================
  // Rendering Methods
  // ============================================================================

  private createRenderContainer(config: ExportConfig): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'chatgpt-exporter-render-container';
    // Base font size increased for better readability
    const baseFontSize = Math.max(18, Math.round(16 * (config.fontSize / 100)));
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: ${this.options.maxWidth}px;
      background: ${config.darkMode ? '#1a1a1a' : '#ffffff'};
      color: ${config.darkMode ? '#ffffff' : '#1a1a1a'};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${baseFontSize}px;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Add KaTeX styles for math rendering
    const style = document.createElement('style');
    style.textContent = getKatexStyles() + `
      /* Reset any strikethrough/underline that might corrupt text */
      del, s, strike {
        text-decoration: none !important;
      }
      .math-block {
        display: block;
        margin: 16px 0;
        padding: 12px;
        background: ${config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'};
        border-radius: 8px;
        overflow-x: auto;
        text-align: center;
      }
      .math-inline {
        display: inline;
        padding: 0 2px;
      }
      .katex {
        color: ${config.darkMode ? '#e0e0e0' : '#1a1a1a'};
        font-size: 1.1em;
      }
      .katex-display {
        margin: 0.5em 0;
      }
      /* Fix fraction rendering - ensure proper spacing */
      .katex .frac-line {
        border-bottom-style: solid !important;
        border-bottom-width: 0.04em !important;
        min-height: 0.04em !important;
        text-decoration: none !important;
      }
      .katex .mfrac > span > span {
        text-align: center;
      }
      .katex .mfrac .frac-line {
        width: 100%;
        position: relative;
      }
      /* Ensure numerator and denominator have proper spacing from the line */
      .katex .mfrac > span:first-child {
        padding-bottom: 0.15em;
      }
      .katex .mfrac > span:last-child {
        padding-top: 0.15em;
      }
      /* Fix vertical alignment in fractions */
      .katex .vlist-t {
        display: inline-table;
        table-layout: fixed;
      }
      .katex .vlist-r {
        display: table-row;
      }
      .katex .vlist {
        display: table-cell;
        vertical-align: bottom;
        position: relative;
      }
    `;
    container.appendChild(style);

    return container;
  }

  private renderConversationToContainer(
    container: HTMLDivElement,
    conversation: Conversation,
    messages: Message[],
    config: ExportConfig
  ): void {
    // Add title
    if (config.contentTitle) {
      const title = document.createElement('h1');
      // Clean the title text
      const titleText = this.cleanTextContent(
        config.contentTitle.replace('{title}', conversation.title)
      );
      title.textContent = titleText;
      title.style.cssText = `
        margin: 0 0 16px 0;
        font-size: 28px;
        font-weight: 700;
        color: ${config.darkMode ? '#ffffff' : '#1a1a1a'};
        line-height: 1.3;
      `;
      container.appendChild(title);
    }

    // Add user info if enabled
    if (config.includeUserInfo && (config.userName || config.userEmail)) {
      const userInfo = document.createElement('div');
      userInfo.style.cssText = `
        margin-bottom: 16px;
        font-size: 14px;
        color: ${config.darkMode ? '#888' : '#666'};
      `;
      if (config.userName) {
        userInfo.innerHTML += `<div>Author: ${config.userName}</div>`;
      }
      if (config.userEmail) {
        userInfo.innerHTML += `<div>Email: ${config.userEmail}</div>`;
      }
      container.appendChild(userInfo);
    }

    // Add date/time if enabled
    if (config.showDateTime) {
      const dateTime = document.createElement('div');
      dateTime.style.cssText = `
        margin-bottom: 24px;
        font-size: 14px;
        color: ${config.darkMode ? '#888' : '#666'};
      `;
      dateTime.textContent = `Exported: ${new Date().toLocaleString()}`;
      container.appendChild(dateTime);
    }

    // Render messages
    messages.forEach((message, index) => {
      const messageEl = this.renderMessage(message, config);

      // Add page break if configured
      if (config.pageBreakPerPrompt && index > 0 && message.role === 'user') {
        messageEl.style.pageBreakBefore = 'always';
      }

      container.appendChild(messageEl);
    });
  }

  private renderMessage(message: Message, config: ExportConfig): HTMLDivElement {
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
      margin-bottom: 20px;
    `;

    // Add role header - clean and minimal
    const header = document.createElement('div');
    header.style.cssText = `
      margin-bottom: 6px;
      font-weight: 600;
      font-size: 13px;
      color: ${message.role === 'user' 
        ? (config.darkMode ? '#93c5fd' : '#2563eb')
        : (config.darkMode ? '#86efac' : '#16a34a')};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    if (config.showIcons) {
      const icon = document.createElement('span');
      icon.textContent = message.role === 'user' ? '👤 ' : '🤖 ';
      header.appendChild(icon);
    }

    const roleLabel = document.createElement('span');
    roleLabel.textContent = message.role === 'user' ? 'You' : 'ChatGPT';
    header.appendChild(roleLabel);

    messageEl.appendChild(header);

    // Render content blocks
    const contentEl = document.createElement('div');
    contentEl.style.cssText = `
      color: ${config.darkMode ? '#e0e0e0' : '#333'};
      line-height: 1.6;
    `;

    if (message.content.length > 0) {
      message.content.forEach(block => {
        const blockEl = this.renderContentBlock(block, config);
        if (blockEl) {
          contentEl.appendChild(blockEl);
        }
      });
    } else {
      // Fallback to raw HTML
      contentEl.innerHTML = message.rawHtml || '';
    }

    messageEl.appendChild(contentEl);

    return messageEl;
  }

  private renderContentBlock(block: ContentBlock, config: ExportConfig): HTMLElement | null {
    switch (block.type) {
      case 'text':
        return this.renderTextBlock(block, config);
      case 'code':
        return this.renderCodeBlock(block, config);
      case 'table':
        return this.renderTableBlock(block, config);
      case 'thinking':
        return this.renderThinkingBlock(block, config);
      default:
        return null;
    }
  }

  private renderTextBlock(block: { type: 'text'; content: string }, config: ExportConfig): HTMLElement {
    const container = document.createElement('div');
    
    // Clean and format the content
    let content = this.cleanTextContent(block.content);
    
    // Check if this is a heading (starts with # or numbered like "1. Title")
    const headingMatch = content.match(/^(#{1,6})\s+(.+)$/m) || 
                         content.match(/^(\d+)\.\s+([A-Z][^.]+)$/m);
    
    if (headingMatch && content.length < 200) {
      // Render as heading
      const level = headingMatch[1].startsWith('#') ? headingMatch[1].length : 2;
      const text = headingMatch[2] || headingMatch[0];
      container.style.cssText = `
        margin: ${level <= 2 ? '20px' : '14px'} 0 ${level <= 2 ? '12px' : '8px'} 0;
        font-size: ${24 - (level * 2)}px;
        font-weight: ${level <= 2 ? '700' : '600'};
        color: ${config.darkMode ? '#ffffff' : '#1a1a1a'};
        line-height: 1.3;
      `;
      container.textContent = text.replace(/^#+\s*/, '');
      return container;
    }

    // Regular text block
    container.style.cssText = `
      margin: 0 0 8px 0;
      line-height: 1.6;
    `;

    // Check if content contains LaTeX
    if (containsLatex(content)) {
      try {
        const processedHtml = processTextWithLatex(content);
        container.innerHTML = processedHtml;
        
        // Style the rendered math
        container.querySelectorAll('.katex-block').forEach(el => {
          (el as HTMLElement).style.cssText = `
            display: block;
            margin: 8px 0;
            text-align: center;
          `;
        });

        container.querySelectorAll('.katex-inline').forEach(el => {
          (el as HTMLElement).style.cssText = `
            display: inline;
          `;
        });

        container.querySelectorAll('.katex-error').forEach(el => {
          (el as HTMLElement).style.cssText += `
            color: ${config.darkMode ? '#f87171' : '#dc2626'};
            font-family: monospace;
            font-size: 0.9em;
          `;
        });
      } catch (error) {
        console.warn('LaTeX rendering failed:', error);
        container.textContent = content;
      }
    } else {
      container.textContent = content;
    }

    return container;
  }

  /**
   * Clean and format text content
   * Preserves LaTeX formulas while cleaning other text
   */
  private cleanTextContent(text: string): string {
    // First, fix corrupted LaTeX (backslash written as \backslash)
    let cleaned = this.fixCorruptedLatex(text);
    
    // Extract and preserve LaTeX blocks
    const latexBlocks: string[] = [];
    const placeholder = '___LATEX_PLACEHOLDER_';
    
    // Preserve $$...$$ blocks
    cleaned = cleaned.replace(/\$\$[\s\S]+?\$\$/g, (match) => {
      latexBlocks.push(match);
      return `${placeholder}${latexBlocks.length - 1}___`;
    });
    
    // Preserve $...$ inline blocks
    cleaned = cleaned.replace(/\$[^$]+\$/g, (match) => {
      latexBlocks.push(match);
      return `${placeholder}${latexBlocks.length - 1}___`;
    });
    
    // Now clean the non-LaTeX text
    
    // Fix CamelCase - insert space between lowercase and uppercase (but not in placeholders)
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Fix PascalCase sequences
    cleaned = cleaned.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    
    // Clean up bullet symbols
    cleaned = cleaned.replace(/·/g, '•');
    cleaned = cleaned.replace(/\$\\cdot\$/g, '•');
    
    // Remove standalone weird symbols (±, ω, @, 1) used as speaker indicators
    cleaned = cleaned.replace(/^\s*[±ω@]\s*/gm, '');
    cleaned = cleaned.replace(/\s+[±ω]\s+/g, ' ');
    cleaned = cleaned.replace(/^\d+\s+(YOU|you|CHATGPT|ChatGPT)\s*$/gm, '');
    
    // Remove horizontal divider lines
    cleaned = cleaned.replace(/^[\s]*[-_=]{3,}[\s]*$/gm, '');
    cleaned = cleaned.replace(/\n[-_=]{3,}\n/g, '\n');
    
    // Fix multiple spaces
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
    
    // Fix line breaks with excessive spacing  
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Trim each line
    cleaned = cleaned.split('\n').map(line => line.trim()).filter(line => line !== '---' && line !== '___' && line !== '===').join('\n');
    
    // Restore LaTeX blocks
    latexBlocks.forEach((block, index) => {
      cleaned = cleaned.replace(`${placeholder}${index}___`, block);
    });
    
    return cleaned.trim();
  }

  /**
   * Fix corrupted LaTeX where backslashes were escaped
   */
  private fixCorruptedLatex(text: string): string {
    let fixed = text;
    
    // Remove horizontal rule lines
    fixed = fixed.replace(/^-{3,}$/gm, '');
    fixed = fixed.replace(/\n-{3,}\n/g, '\n');
    
    // Fix escaped dollar signs: \$ -> $
    fixed = fixed.replace(/\\\$/g, '$');
    
    // Fix vertical bars used as backslashes: |frac -> \frac
    fixed = fixed.replace(/\|(frac|left|right|sqrt|sin|cos|tan|text|Rightarrow|neq|leq|geq|pi)/g, '\\$1');
    
    // Fix angle brackets used as curly braces: \langle x\rangle -> {x}
    fixed = fixed.replace(/\\langle\s*/g, '{');
    fixed = fixed.replace(/\s*\\rangle/g, '}');
    
    // Fix \backslash -> \
    fixed = fixed.replace(/\\backslash\s*/g, '\\');
    
    // Fix spaced-out commands: \f r a c -> \frac
    fixed = fixed.replace(/\\f\s*r\s*a\s*c/g, '\\frac');
    fixed = fixed.replace(/\\s\s*q\s*r\s*t/g, '\\sqrt');
    fixed = fixed.replace(/\\t\s*e\s*x\s*t/g, '\\text');
    
    // Fix \{operatorname{...} -> \...
    fixed = fixed.replace(/\\\{operatorname\{(frac|sin|cos|tan|log|ln|exp|sqrt)\}\}/g, '\\$1');
    fixed = fixed.replace(/\{\\operatorname\{(frac|sin|cos|tan|log|ln|exp|sqrt)\}/g, '\\$1{');
    fixed = fixed.replace(/\\operatorname\{(frac|sin|cos|tan|log|ln|exp|sqrt)\}/g, '\\$1');
    
    // Fix \left\{frac -> \left(\frac
    fixed = fixed.replace(/\\left\\\{frac/g, '\\left(\\frac');
    fixed = fixed.replace(/\\left\{frac/g, '\\left(\\frac');
    
    // Fix right patterns
    fixed = fixed.replace(/\\right\}/g, '\\right)');
    fixed = fixed.replace(/\}right\)/g, '\\right)');
    fixed = fixed.replace(/\(right\)/g, '\\right)');
    fixed = fixed.replace(/right\\\^(\d)/g, '\\right)^$1');
    fixed = fixed.replace(/\}right\^(\d)/g, '\\right)^$1');
    
    // Fix \frac(a)(b) -> \frac{a}{b}
    fixed = fixed.replace(/\\frac\(([^)]+)\)\(([^)]+)\)/g, '\\frac{$1}{$2}');
    
    // Fix \{frac{...}{...}\} -> \frac{...}{...}
    fixed = fixed.replace(/\\\{frac\{([^}]+)\}\{([^}]+)\}\}/g, '\\frac{$1}{$2}');
    fixed = fixed.replace(/\{frac\{([^}]+)\}\{([^}]+)\}/g, '\\frac{$1}{$2}');
    
    // Fix \mathrm{x} -> x
    fixed = fixed.replace(/\\mathrm\{([a-zA-Z])\}/g, '$1');
    
    // Fix ^ written as \^ or \wedge
    fixed = fixed.replace(/\\\^/g, '^');
    fixed = fixed.replace(/\{\\wedge\}/g, '^');
    fixed = fixed.replace(/\\wedge/g, '^');
    
    // Fix \text{...} patterns
    fixed = fixed.replace(/\\text\s*\{/g, '\\text{');
    fixed = fixed.replace(/\{text\{([^}]*)\}/g, '\\text{$1}');
    
    // Fix dfrac -> frac
    fixed = fixed.replace(/\\dfrac/g, '\\frac');
    
    // Fix \quad and \qquad
    fixed = fixed.replace(/\\quad\s*/g, ' ');
    fixed = fixed.replace(/\\qquad\s*/g, '  ');
    
    // Fix \left and \right
    fixed = fixed.replace(/\\left\s*\(/g, '\\left(');
    fixed = fixed.replace(/\\right\s*\)/g, '\\right)');
    
    // Fix \Rightarrow
    fixed = fixed.replace(/\\Rightarrow\s*/g, ' \\Rightarrow ');
    
    // Remove \underline and \boldsymbol
    fixed = fixed.replace(/\\underline\{([^}]+)\}/g, '$1');
    fixed = fixed.replace(/\\boldsymbol\{([^}]+)\}/g, '$1');
    
    // Fix stray backslashes before trig functions
    fixed = fixed.replace(/\\\s+(cos|sin|tan|log|ln|exp|sqrt)/g, '\\$1');
    
    // Clean up double backslashes
    fixed = fixed.replace(/\\\\/g, ' ');
    
    return fixed;
  }

  private renderCodeBlock(
    block: { type: 'code'; content: string; language: string | null },
    config: ExportConfig
  ): HTMLPreElement {
    const pre = document.createElement('pre');
    pre.style.cssText = `
      margin: 12px 0;
      padding: 16px;
      background: ${config.darkMode ? '#0d0d0d' : '#f4f4f4'};
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 14px;
      line-height: 1.4;
    `;

    const code = document.createElement('code');
    if (block.language) {
      code.className = `language-${block.language}`;
    }
    code.textContent = block.content;

    pre.appendChild(code);
    return pre;
  }

  private renderTableBlock(
    block: { type: 'table'; headers: string[]; rows: string[][] },
    config: ExportConfig
  ): HTMLTableElement {
    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      margin: 12px 0;
      border-collapse: collapse;
      font-size: 14px;
    `;

    // Header
    if (block.headers.length > 0) {
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      block.headers.forEach(header => {
        const th = document.createElement('th');
        th.style.cssText = `
          padding: 12px;
          background: ${config.darkMode ? '#333' : '#e0e0e0'};
          border: 1px solid ${config.darkMode ? '#444' : '#ccc'};
          text-align: left;
          font-weight: 600;
        `;
        th.textContent = header;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
    }

    // Body
    const tbody = document.createElement('tbody');
    block.rows.forEach(row => {
      const tr = document.createElement('tr');
      row.forEach(cell => {
        const td = document.createElement('td');
        td.style.cssText = `
          padding: 10px 12px;
          border: 1px solid ${config.darkMode ? '#444' : '#ccc'};
        `;
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
  }

  private renderThinkingBlock(
    block: { type: 'thinking'; content: string },
    config: ExportConfig
  ): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      margin: 12px 0;
      padding: 16px;
      background: ${config.darkMode ? '#1a1a2e' : '#f0f0ff'};
      border-left: 4px solid ${config.darkMode ? '#6366f1' : '#4f46e5'};
      border-radius: 0 8px 8px 0;
      font-style: italic;
      color: ${config.darkMode ? '#a0a0a0' : '#666'};
    `;

    const label = document.createElement('div');
    label.style.cssText = `
      font-weight: 600;
      margin-bottom: 8px;
      color: ${config.darkMode ? '#6366f1' : '#4f46e5'};
    `;
    label.textContent = '💭 Thinking';
    div.appendChild(label);

    const content = document.createElement('div');
    content.textContent = block.content;
    div.appendChild(content);

    return div;
  }

  private addPageNumbers(pdf: jsPDF, config: ExportConfig): void {
    const pageCount = pdf.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(config.darkMode ? 150 : 100);
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  }
}

// ============================================================================
// Default Export
// ============================================================================

export function createPdfExporter(options?: PdfExportOptions): PdfExporter {
  return new PdfExporter(options);
}

