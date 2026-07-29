/**
 * Parses the ATX heading outline of a markdown document.
 *
 * Limitations (documented behavior):
 * - Only ATX headings (`# ` .. `###### `, up to 3 leading spaces) are recognized; setext headings are not treated as sections.
 * - Bodies are assumed to be LF-normalized (GROWI replaces CR/CRLF with LF on read); a trailing `\r` is tolerated for matching.
 */

import { GrowiApiError } from '../../api/growi-api-error.js';

export interface OutlineEntry {
  /** Heading level (1-6) */
  level: number;
  /** Heading text without the leading `#` marks */
  text: string;
  /** 1-indexed line number of the heading line */
  startLine: number;
  /** 1-indexed inclusive last line of the section (up to the next heading of the same or higher level) */
  endLine: number;
  /** Character count of the section (heading line through endLine, including newlines) */
  chars: number;
}

export interface SectionRange {
  startLine: number;
  endLine: number;
  chars: number;
}

export interface MarkdownOutline {
  outline: OutlineEntry[];
  /** Content before the first heading. Present only when such content exists (or when the document has no headings). */
  preamble?: SectionRange;
  totalLines: number;
  totalChars: number;
  /** True when a code fence is left open at EOF: per CommonMark it runs to the end, so headings after it are not listed */
  unterminatedFence?: boolean;
}

/**
 * Heading resolution failure. Subclasses GrowiApiError so it stays within the repo's
 * two-tier error model (GrowiApiError internally, UserError at the register boundary);
 * registers may still branch on it via instanceof for a richer error payload.
 */
export class HeadingMatchError extends GrowiApiError {
  constructor(
    message: string,
    public kind: 'not-found' | 'ambiguous',
    public candidates: Array<{ text: string; level: number; startLine: number }>,
  ) {
    super(message, 422, { kind, candidates });
    this.name = 'HeadingMatchError';
  }
}

const HEADING_PATTERN = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const FENCE_OPEN_PATTERN = /^ {0,3}(`{3,}|~{3,})(.*)$/;

interface FenceState {
  char: string;
  length: number;
}

const detectFrontmatterEnd = (lines: string[]): number => {
  if (lines.length === 0 || lines[0].trimEnd() !== '---') {
    return 0;
  }
  for (let i = 1; i < lines.length; i++) {
    const trimmed = lines[i].trimEnd();
    if (trimmed === '---' || trimmed === '...') {
      return i + 1; // 1-indexed line number of the closing delimiter
    }
    // A heading-shaped line means this is a document starting with a thematic break, not YAML frontmatter
    if (HEADING_PATTERN.test(lines[i].replace(/\r$/, ''))) {
      return 0;
    }
  }
  return 0; // unterminated: do not treat as frontmatter
};

const sliceChars = (lines: string[], startLine: number, endLine: number): number => {
  let chars = 0;
  for (let i = startLine - 1; i < endLine; i++) {
    chars += lines[i].length;
  }
  return chars + (endLine - startLine); // newlines between the lines
};

export const parseMarkdownOutline = (body: string): MarkdownOutline => {
  const lines = body.split('\n');
  const totalLines = lines.length;
  const frontmatterEnd = detectFrontmatterEnd(lines);

  const headings: Array<{ level: number; text: string; startLine: number }> = [];
  let fence: FenceState | null = null;

  for (let i = frontmatterEnd; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '');

    if (fence != null) {
      const closeMatch = line.match(FENCE_OPEN_PATTERN);
      if (closeMatch != null && closeMatch[1][0] === fence.char && closeMatch[1].length >= fence.length && closeMatch[2].trim() === '') {
        fence = null;
      }
      continue;
    }

    const fenceMatch = line.match(FENCE_OPEN_PATTERN);
    if (fenceMatch != null) {
      const marker = fenceMatch[1];
      // A backtick fence cannot have backticks in its info string (CommonMark)
      if (marker[0] === '~' || !fenceMatch[2].includes('`')) {
        fence = { char: marker[0], length: marker.length };
        continue;
      }
    }

    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch != null) {
      const rawText = headingMatch[2] ?? '';
      // Strip an optional ATX closing sequence (e.g. `## Title ##`)
      const text = rawText.replace(/[ \t]+#+$/, '').trim();
      headings.push({ level: headingMatch[1].length, text, startLine: i + 1 });
    }
  }

  const outline: OutlineEntry[] = headings.map((heading, index) => {
    let endLine = totalLines;
    for (let j = index + 1; j < headings.length; j++) {
      if (headings[j].level <= heading.level) {
        endLine = headings[j].startLine - 1;
        break;
      }
    }
    return { ...heading, endLine, chars: sliceChars(lines, heading.startLine, endLine) };
  });

  let preamble: SectionRange | undefined;
  if (outline.length === 0) {
    preamble = { startLine: 1, endLine: totalLines, chars: body.length };
  } else if (outline[0].startLine > 1) {
    const endLine = outline[0].startLine - 1;
    preamble = { startLine: 1, endLine, chars: sliceChars(lines, 1, endLine) };
  }

  return { outline, preamble, totalLines, totalChars: body.length, unterminatedFence: fence != null || undefined };
};

/**
 * Resolves a heading (by exact text, falling back to case-insensitive match) to its section line range.
 * @throws HeadingMatchError when the heading is not found or matches multiple headings
 */
export const resolveHeadingRange = (
  outline: OutlineEntry[],
  heading: string,
  includeSubsections: boolean,
): { startLine: number; endLine: number; matched: OutlineEntry } => {
  let matches = outline.filter((entry) => entry.text === heading);
  if (matches.length === 0) {
    const lowered = heading.toLowerCase();
    matches = outline.filter((entry) => entry.text.toLowerCase() === lowered);
  }

  if (matches.length === 0) {
    throw new HeadingMatchError(
      `Heading "${heading}" was not found in the page`,
      'not-found',
      outline.map(({ text, level, startLine }) => ({ text, level, startLine })),
    );
  }
  if (matches.length > 1) {
    throw new HeadingMatchError(
      `Heading "${heading}" matches ${matches.length} headings; disambiguate with startLine/endLine instead`,
      'ambiguous',
      matches.map(({ text, level, startLine }) => ({ text, level, startLine })),
    );
  }

  const matched = matches[0];
  if (includeSubsections) {
    return { startLine: matched.startLine, endLine: matched.endLine, matched };
  }

  // Without subsections: stop right before the first deeper heading inside the section
  const firstChild = outline.find((entry) => entry.startLine > matched.startLine && entry.startLine <= matched.endLine);
  const endLine = firstChild != null ? firstChild.startLine - 1 : matched.endLine;
  return { startLine: matched.startLine, endLine, matched };
};
