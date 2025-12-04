// ============================================================================
// LaTeX Rendering Utilities
// Uses KaTeX for rendering mathematical formulas
// ============================================================================

import katex from 'katex';

// ============================================================================
// Types
// ============================================================================

export interface LatexRenderOptions {
  displayMode?: boolean;  // Block mode (centered, larger) vs inline
  throwOnError?: boolean; // Throw error or render error message
  errorColor?: string;    // Color for error messages
  macros?: Record<string, string>; // Custom macros
}

export interface RenderedLatex {
  html: string;
  error?: string;
}

// ============================================================================
// Rendering Functions
// ============================================================================

/**
 * Render a LaTeX expression to HTML using KaTeX
 */
export function renderLatex(
  latex: string,
  options: LatexRenderOptions = {}
): RenderedLatex {
  const { 
    displayMode = false, 
    throwOnError = false,
    errorColor = '#cc0000',
    macros = {}
  } = options;

  // Clean latex before rendering
  let cleanedLatex = latex.trim();
  if (cleanedLatex.endsWith('.')) {
    cleanedLatex = cleanedLatex.slice(0, -1);
  }

  try {
    const html = katex.renderToString(cleanedLatex, {
      displayMode,
      throwOnError: true,
      errorColor,
      macros,
      trust: false,
      strict: 'warn',
    });

    return { html };
  } catch (error) {
    // Try with more lenient settings
    try {
      const html = katex.renderToString(cleanedLatex, {
        displayMode,
        throwOnError: false,
        errorColor,
        macros,
        trust: true,
        strict: false,
      });
      return { html };
    } catch {
      // Continue to error fallback
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (throwOnError) {
      throw error;
    }

    // Return styled error message
    return {
      html: `<span style="color: ${errorColor}; font-family: monospace;">${escapeHtml(latex)}</span>`,
      error: errorMessage,
    };
  }
}

/**
 * Render inline math ($...$)
 */
export function renderInlineMath(latex: string): RenderedLatex {
  return renderLatex(latex, { displayMode: false });
}

/**
 * Render block/display math ($$...$$)
 */
export function renderBlockMath(latex: string): RenderedLatex {
  return renderLatex(latex, { displayMode: true });
}

// ============================================================================
// Text Processing
// ============================================================================

/**
 * Process text containing LaTeX expressions and render them
 * Returns HTML with rendered math
 * Supports multiple delimiters: $...$, $$...$$, \(...\), \[...\]
 */
export function processTextWithLatex(text: string): string {
  let processed = text;

  // First, unescape HTML entities that might be in the text
  processed = unescapeHtmlEntities(processed);
  
  // Fix corrupted LaTeX patterns before processing
  processed = fixCorruptedLatexPatterns(processed);

  // Process block math first (multiple formats)
  // Format: $$...$$ (multiline allowed)
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_match, latex) => {
    try {
      const cleanLatex = cleanLatexContent(latex.trim());
      const rendered = renderBlockMath(cleanLatex);
      return `<div class="katex-block">${rendered.html}</div>`;
    } catch (e) {
      console.warn('LaTeX block render failed:', e);
      return `<div class="katex-block katex-error">${escapeHtml(latex)}</div>`;
    }
  });

  // Format: \[...\] (ChatGPT style block math - multiline allowed)
  processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (_match, latex) => {
    try {
      const cleanLatex = cleanLatexContent(latex.trim());
      const rendered = renderBlockMath(cleanLatex);
      return `<div class="katex-block">${rendered.html}</div>`;
    } catch (e) {
      console.warn('LaTeX block render failed:', e);
      return `<div class="katex-block katex-error">${escapeHtml(latex)}</div>`;
    }
  });

  // Format: \begin{equation}...\end{equation}
  processed = processed.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (_match, latex) => {
    try {
      const cleanLatex = cleanLatexContent(latex.trim());
      const rendered = renderBlockMath(cleanLatex);
      return `<div class="katex-block">${rendered.html}</div>`;
    } catch (e) {
      console.warn('LaTeX equation render failed:', e);
      return `<div class="katex-block katex-error">${escapeHtml(latex)}</div>`;
    }
  });

  // Format: \begin{align}...\end{align}
  processed = processed.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (_match, latex) => {
    try {
      const cleanLatex = cleanLatexContent(latex.trim());
      const rendered = renderBlockMath(cleanLatex);
      return `<div class="katex-block">${rendered.html}</div>`;
    } catch (e) {
      console.warn('LaTeX align render failed:', e);
      return `<div class="katex-block katex-error">${escapeHtml(latex)}</div>`;
    }
  });

  // Process inline math (multiple formats)
  // Format: \(...\) (ChatGPT style inline math - can span parts but not newlines)
  processed = processed.replace(/\\\((.+?)\\\)/g, (_match, latex) => {
    try {
      const cleanLatex = cleanLatexContent(latex.trim());
      const rendered = renderInlineMath(cleanLatex);
      return `<span class="katex-inline">${rendered.html}</span>`;
    } catch (e) {
      console.warn('LaTeX inline render failed:', e);
      return `<span class="katex-inline katex-error">${escapeHtml(latex)}</span>`;
    }
  });

  // Format: $...$ - be careful not to match $$
  // Allow formulas ending with period: $...$. or $...\.$
  processed = processed.replace(/(?<!\$)\$(?!\$)([^$]+?)\$(?!\$)/g, (_match, latex) => {
    try {
      // Remove trailing period if present (it's not part of the formula)
      let cleanLatex = latex.trim();
      if (cleanLatex.endsWith('.')) {
        cleanLatex = cleanLatex.slice(0, -1).trim();
      }
      cleanLatex = cleanLatexContent(cleanLatex);
      const rendered = renderInlineMath(cleanLatex);
      return `<span class="katex-inline">${rendered.html}</span>`;
    } catch (e) {
      console.warn('LaTeX inline render failed:', e, latex);
      return `<span class="katex-inline katex-error">${escapeHtml(latex)}</span>`;
    }
  });

  return processed;
}

/**
 * Fix corrupted LaTeX patterns in the full text before extraction
 */
function fixCorruptedLatexPatterns(text: string): string {
  let fixed = text;
  
  // Fix escaped dollar signs: \$ -> $
  fixed = fixed.replace(/\\\$/g, '$');
  
  // Fix vertical bars used as backslashes: |frac -> \frac, |left -> \left
  fixed = fixed.replace(/\|(frac|left|right|sqrt|sin|cos|tan|text|Rightarrow)/g, '\\$1');
  
  // Fix angle brackets used as curly braces: \langle x\rangle -> {x}
  fixed = fixed.replace(/\\langle\s*/g, '{');
  fixed = fixed.replace(/\s*\\rangle/g, '}');
  fixed = fixed.replace(/<([^>]+)>/g, '{$1}');
  
  // Fix \backslash -> \
  fixed = fixed.replace(/\\backslash\s*/g, '\\');
  
  // Fix spaced out commands: \f r a c -> \frac
  fixed = fixed.replace(/\\f\s*r\s*a\s*c/g, '\\frac');
  fixed = fixed.replace(/\\s\s*q\s*r\s*t/g, '\\sqrt');
  fixed = fixed.replace(/\\t\s*e\s*x\s*t/g, '\\text');
  
  return fixed;
}

/**
 * Clean LaTeX content before rendering
 */
function cleanLatexContent(latex: string): string {
  let cleaned = latex;
  
  // Remove trailing periods that aren't part of the formula
  cleaned = cleaned.replace(/\.\s*$/, '');
  
  // Fix vertical bars used as backslashes
  cleaned = cleaned.replace(/\|(frac|left|right|sqrt|sin|cos|tan|text|Rightarrow|neq|leq|geq|pi)/g, '\\$1');
  
  // Fix angle brackets used as curly braces
  cleaned = cleaned.replace(/\\langle\s*/g, '{');
  cleaned = cleaned.replace(/\s*\\rangle/g, '}');
  
  // Fix \backslash -> \
  cleaned = cleaned.replace(/\\backslash\s*/g, '\\');
  
  // Fix \{operatorname{frac} -> \frac
  cleaned = cleaned.replace(/\\\{operatorname\{(frac|sin|cos|tan|log|ln|exp|sqrt)\}\}/g, '\\$1');
  cleaned = cleaned.replace(/\{\\operatorname\{(frac|sin|cos|tan|log|ln|exp|sqrt)\}/g, '\\$1{');
  cleaned = cleaned.replace(/\\operatorname\{(frac|sin|cos|tan|log|ln|exp|sqrt)\}/g, '\\$1');
  
  // Fix \left\{frac -> \left(\frac  
  cleaned = cleaned.replace(/\\left\\\{frac/g, '\\left(\\frac');
  cleaned = cleaned.replace(/\\left\{frac/g, '\\left(\\frac');
  cleaned = cleaned.replace(/\\left\{f\(/g, '\\left(\\frac{');
  
  // Fix broken right patterns
  cleaned = cleaned.replace(/\\right\}/g, '\\right)');
  cleaned = cleaned.replace(/\}right\)/g, '\\right)');
  cleaned = cleaned.replace(/right\\\^(\d)/g, '\\right)^$1');
  cleaned = cleaned.replace(/\}right\^(\d)/g, '\\right)^$1');
  cleaned = cleaned.replace(/\(right\)/g, '\\right)');
  
  // Fix \frac(a)(b) -> \frac{a}{b}
  cleaned = cleaned.replace(/\\frac\(([^)]+)\)\(([^)]+)\)/g, '\\frac{$1}{$2}');
  
  // Fix \{frac{...}{...}\} -> \frac{...}{...}
  cleaned = cleaned.replace(/\\\{frac\{([^}]+)\}\{([^}]+)\}\}/g, '\\frac{$1}{$2}');
  cleaned = cleaned.replace(/\{frac\{([^}]+)\}\{([^}]+)\}/g, '\\frac{$1}{$2}');
  
  // Fix ^ as \wedge or \^
  cleaned = cleaned.replace(/\\wedge/g, '^');
  cleaned = cleaned.replace(/\\\^/g, '^');
  cleaned = cleaned.replace(/\{\^(\d+)\}/g, '^{$1}');
  
  // Fix \mathrm{x} -> x
  cleaned = cleaned.replace(/\\mathrm\{([a-zA-Z])\}/g, '$1');
  
  // Fix \underline{x} -> x
  cleaned = cleaned.replace(/\\underline\{([^}]+)\}/g, '$1');
  cleaned = cleaned.replace(/\\boldsymbol\{([^}]+)\}/g, '$1');
  
  // Fix spacing commands
  cleaned = cleaned.replace(/\\quad\s*/g, ' ');
  cleaned = cleaned.replace(/\\qquad\s*/g, '  ');
  
  // Fix double backslashes (not line breaks)
  cleaned = cleaned.replace(/\\\\\s*(?![\\[])/g, ' ');
  
  // Fix stray text commands
  cleaned = cleaned.replace(/\\text\s*\{/g, '\\text{');
  
  // Fix spaced-out commands
  cleaned = cleaned.replace(/\\f\s+r\s+a\s+c/g, '\\frac');
  cleaned = cleaned.replace(/\\s\s+q\s+r\s+t/g, '\\sqrt');
  
  // Fix common typos in commands
  cleaned = cleaned.replace(/\\neq\s+0/g, '\\neq 0');
  cleaned = cleaned.replace(/\\text\(\s*/g, '\\text{');
  cleaned = cleaned.replace(/\s*\)\\text/g, '}');
  
  // Fix unbalanced braces - ensure basic balance
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    cleaned += '}'.repeat(openBraces - closeBraces);
  }
  
  return cleaned;
}

/**
 * Unescape common HTML entities
 */
function unescapeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Check if text contains LaTeX expressions
 * Supports: $...$, $$...$$, \(...\), \[...\], \begin{...}
 */
export function containsLatex(text: string): boolean {
  return (
    /\$[^$]+\$/.test(text) ||           // $...$ or $$...$$
    /\\\([^)]+\\\)/.test(text) ||       // \(...\)
    /\\\[[^\]]+\\\]/.test(text) ||      // \[...\]
    /\\begin\{/.test(text) ||            // \begin{equation}, \begin{align}, etc.
    /\\frac\{/.test(text) ||             // Common LaTeX commands
    /\\sqrt\{/.test(text) ||
    /\\sum/.test(text) ||
    /\\int/.test(text) ||
    /\\alpha|\\beta|\\gamma|\\delta/.test(text) ||
    /\\ge|\\le|\\neq/.test(text)
  );
}

/**
 * Extract all LaTeX expressions from text
 */
export function extractLatexExpressions(text: string): Array<{
  raw: string;
  isBlock: boolean;
  startIndex: number;
  endIndex: number;
}> {
  const expressions: Array<{
    raw: string;
    isBlock: boolean;
    startIndex: number;
    endIndex: number;
  }> = [];

  // Find block math ($$...$$)
  const blockRegex = /\$\$([^$]+)\$\$/g;
  let match;
  while ((match = blockRegex.exec(text)) !== null) {
    expressions.push({
      raw: match[1],
      isBlock: true,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Find inline math ($...$) - exclude positions already covered by block math
  const inlineRegex = /(?<!\$)\$(?!\$)([^$]+)\$(?!\$)/g;
  while ((match = inlineRegex.exec(text)) !== null) {
    // Check if this overlaps with any block expression
    const overlaps = expressions.some(
      exp => match!.index >= exp.startIndex && match!.index < exp.endIndex
    );
    if (!overlaps) {
      expressions.push({
        raw: match[1],
        isBlock: false,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // Sort by position
  expressions.sort((a, b) => a.startIndex - b.startIndex);

  return expressions;
}

// ============================================================================
// KaTeX CSS
// ============================================================================

/**
 * Get KaTeX CSS styles for injection
 * These styles are needed for proper rendering
 */
export function getKatexStyles(): string {
  return `
    .katex {
      font: normal 1.1em KaTeX_Main, Times New Roman, serif;
      line-height: 1.2;
      text-indent: 0;
      text-rendering: auto;
    }
    .katex-display {
      display: block;
      margin: 1em 0;
      text-align: center;
    }
    .katex-display > .katex {
      display: block;
      text-align: center;
      white-space: nowrap;
    }
    .katex-block {
      display: block;
      margin: 1em 0;
      text-align: center;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .katex-inline {
      display: inline;
    }
    .katex .base {
      position: relative;
      display: inline-block;
      white-space: nowrap;
      width: min-content;
    }
    .katex .strut {
      display: inline-block;
    }
    .katex .mathdefault {
      font-family: KaTeX_Math;
      font-style: italic;
    }
    .katex .mathit {
      font-family: KaTeX_Main;
      font-style: italic;
    }
    .katex .mathrm {
      font-style: normal;
    }
    .katex .mathbf {
      font-family: KaTeX_Main;
      font-weight: bold;
    }
    .katex .amsrm {
      font-family: KaTeX_AMS;
    }
    .katex .mathbb {
      font-family: KaTeX_AMS;
    }
    .katex .mathcal {
      font-family: KaTeX_Caligraphic;
    }
    .katex .mathfrak {
      font-family: KaTeX_Frak;
    }
    .katex .mathtt {
      font-family: KaTeX_Typewriter;
    }
    .katex .mathscr {
      font-family: KaTeX_Script;
    }
    .katex .mathsf {
      font-family: KaTeX_SansSerif;
    }
    .katex .mord {
      display: inline-block;
    }
    .katex .mop {
      display: inline-block;
    }
    .katex .mbin {
      display: inline-block;
    }
    .katex .mrel {
      display: inline-block;
    }
    .katex .mopen {
      display: inline-block;
    }
    .katex .mclose {
      display: inline-block;
    }
    .katex .mpunct {
      display: inline-block;
    }
    .katex .minner {
      display: inline-block;
    }
    .katex .mfrac {
      display: inline-block;
      text-align: center;
    }
    .katex .frac-line {
      display: inline-block;
      width: 100%;
      border-bottom-style: solid;
    }
    .katex .sqrt {
      display: inline-block;
    }
    .katex .sqrt > .root {
      margin-left: 0.27777778em;
      margin-right: -0.55555556em;
    }
    .katex .op-symbol {
      position: relative;
    }
    .katex .accent > .vlist-t {
      text-align: center;
    }
  `;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Common LaTeX macros for convenience
 */
export const COMMON_MACROS: Record<string, string> = {
  '\\R': '\\mathbb{R}',
  '\\N': '\\mathbb{N}',
  '\\Z': '\\mathbb{Z}',
  '\\Q': '\\mathbb{Q}',
  '\\C': '\\mathbb{C}',
  '\\vec': '\\mathbf',
  '\\grad': '\\nabla',
  '\\div': '\\nabla \\cdot',
  '\\curl': '\\nabla \\times',
};

