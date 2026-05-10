import katex from 'katex';
import { marked } from 'marked';

// Matches $$ display math $$ first, then $ inline math $
// Also matches \[...\] display and \(...\) inline alternate notations
const MATH_RE = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^\$\n]+?)\$|\\\(([\s\S]+?)\\\)/g;
const SPACING_SPEC_RE = /\\\[\s*-?\d+(?:\.\d+)?\s*(?:mm|cm|em|ex|pt|pc|in|bp|dd|cc|sp)\s*\]/g;

/**
 * Render a string that may contain LaTeX math ($...$, $$...$$) and markdown.
 *
 * Math is extracted and rendered via KaTeX *before* the text reaches marked,
 * so markdown's GFM underscore/emphasis rules can never corrupt LaTeX formulas
 * like $t_k$ or $\frac{a}{b}$.  The non-math fragments are rendered with
 * marked.parseInline() (no block-level wrapping).
 */
export function renderLatex(text: string): string {
  if (!text) return '';
  text = text.replace(SPACING_SPEC_RE, '\\\\');
  try {
    const parts: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    MATH_RE.lastIndex = 0;
    while ((match = MATH_RE.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(marked.parseInline(text.slice(lastIndex, match.index)) as string);
      }

      // Group 1 or 2 → display math; group 3 or 4 → inline math
      const isDisplay = match[1] !== undefined || match[2] !== undefined;
      const formula = (match[1] ?? match[2] ?? match[3] ?? match[4]).trim();

      try {
        parts.push(katex.renderToString(formula, {
          displayMode: isDisplay,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false,
        }));
      } catch {
        parts.push(match[0]);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(marked.parseInline(text.slice(lastIndex)) as string);
    }

    return parts.join('');
  } catch {
    return text;
  }
}

/**
 * Render block-level markdown (headers, bullet lists, bold, etc.) that also
 * contains LaTeX math. Uses marked.parse() instead of marked.parseInline() so
 * block structure is preserved. Math is still extracted before markdown parsing
 * to prevent GFM rules from corrupting formulas.
 *
 * Use this for multi-line LLM-generated content (revision notes, explanations).
 * Use renderLatex() for single-line question/option text.
 */
export function renderLatexBlock(text: string): string {
  if (!text) return '';
  text = text.replace(SPACING_SPEC_RE, '\\\\');
  try {
    // Replace each math segment with a placeholder, render the markdown,
    // then swap placeholders back with KaTeX-rendered HTML.
    const mathCache: string[] = [];
    const PLACEHOLDER_RE = /\x00MATH(\d+)\x00/g;

    const withPlaceholders = text.replace(MATH_RE, (match, d1, d2, i1, i2) => {
      const isDisplay = d1 !== undefined || d2 !== undefined;
      const formula = (d1 ?? d2 ?? i1 ?? i2).trim();
      let rendered: string;
      try {
        rendered = katex.renderToString(formula, {
          displayMode: isDisplay,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false,
        });
      } catch {
        rendered = match;
      }
      const idx = mathCache.length;
      mathCache.push(rendered);
      return `\x00MATH${idx}\x00`;
    });

    const html = marked.parse(withPlaceholders) as string;
    return html.replace(PLACEHOLDER_RE, (_, idx) => mathCache[Number(idx)] ?? '');
  } catch {
    return text;
  }
}
