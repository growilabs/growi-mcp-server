/**
 * Parses the heading outline of a markdown document.
 *
 * Heading detection is delegated to remark (`remark-parse` + `remark-frontmatter`), the same parser
 * GROWI renders pages with, so the outline lists exactly the headings a reader sees. Section
 * boundaries, the preamble range and character counts are this repository's own contract and are
 * computed here: the syntax tree does not carry them.
 *
 * Lines are split on every CommonMark line ending (`\r\n`, `\r`, `\n`) — the same set micromark
 * counts — because heading line numbers come from the syntax tree while the text they address is
 * sliced out of this line array. Splitting on `\n` alone would desynchronize the two as soon as a
 * body contained a bare `\r` (the usual `replace(/\r\n/g, '\n')` normalization leaves those behind),
 * which reported one heading's line number against another heading's text.
 */

import { toString as renderHeadingText } from 'mdast-util-to-string';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { GrowiApiError } from '../../api/growi-api-error.js';

export interface OutlineEntry {
  /** Heading level (1-6) */
  level: number;
  /** Rendered heading text, matching GROWI's table of contents (inline markup resolved) */
  text: string;
  /** The heading as authored, without the `#` marker and the optional ATX closing sequence */
  raw: string;
  /** 1-indexed line number of the heading line (the text line, for setext headings) */
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
    // `raw` is reported alongside `text` because either may have been used to look the heading up
    public candidates: Array<{ text: string; raw: string; level: number; startLine: number }>,
  ) {
    super(message, 422, { kind, candidates });
    this.name = 'HeadingMatchError';
  }
}

// GFM is deliberately absent: it changes no heading in practice and only costs parse time.
const processor = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']);

const ATX_MARKER_PATTERN = /^#{1,6}/;
const ATX_CLOSING_PATTERN = /[ \t]+#+[ \t]*$/;

const LINE_ENDING_PATTERN = /\r\n|\r|\n/g;

interface SourceLines {
  /** Line contents, without their terminator */
  lines: string[];
  /** `separators[i]` terminates `lines[i]`; the last entry is empty */
  separators: string[];
}

/**
 * Splits a body into lines on every CommonMark line ending, keeping the terminators so character
 * counts stay exact for `\r\n` bodies too. Line `n` of the syntax tree is `lines[n - 1]` here.
 */
const splitSourceLines = (body: string): SourceLines => {
  const lines: string[] = [];
  const separators: string[] = [];
  LINE_ENDING_PATTERN.lastIndex = 0;
  let start = 0;
  let match = LINE_ENDING_PATTERN.exec(body);
  while (match != null) {
    lines.push(body.slice(start, match.index));
    separators.push(match[0]);
    start = match.index + match[0].length;
    match = LINE_ENDING_PATTERN.exec(body);
  }
  lines.push(body.slice(start));
  separators.push('');
  return { lines, separators };
};

/** Line contents of a body, split the same way `parseMarkdownOutline` numbers them. */
export const splitLines = (body: string): string[] => splitSourceLines(body).lines;

/**
 * Recovers the authored heading notation, which the syntax tree does not keep (it only holds
 * rendered text). The source line is sliced at the node's start column so container markers
 * (list bullets, blockquote `>`) stay out, then the ATX marker and closing sequence are removed.
 * Setext headings carry no markers, so their body lines are taken as they are, minus the underline.
 */
const extractRawHeading = (lines: string[], startLine: number, startColumn: number, endLine: number): string => {
  const firstLine = (lines[startLine - 1] ?? '').slice(startColumn - 1);

  if (endLine > startLine) {
    // Continuation lines of a setext heading: slice at the same column so container markers stay out
    const continuation = lines.slice(startLine, endLine - 1).map((line) => line.slice(startColumn - 1).trim());
    return [firstLine.trim(), ...continuation].join('\n');
  }

  return firstLine.replace(ATX_MARKER_PATTERN, '').replace(ATX_CLOSING_PATTERN, '').trim();
};

interface DetectedHeading {
  level: number;
  text: string;
  raw: string;
  startLine: number;
}

/**
 * Headings whose label renders empty (`#` on its own) are kept. Dropping them would silently fold
 * their lines into the preceding section, and the outline is meant to mirror the document structure.
 */
const detectHeadings = (body: string, lines: string[]): DetectedHeading[] => {
  const tree = processor.parse(body);
  const headings: DetectedHeading[] = [];

  visit(tree, 'heading', (node) => {
    // The braces matter: a callback returning a number is read by unist-util-visit as the index to
    // continue from, and `push` returns the new length, which makes it revisit the same node.
    const position = node.position;
    if (position == null) {
      return;
    }
    headings.push({
      level: node.depth,
      text: renderHeadingText(node),
      raw: extractRawHeading(lines, position.start.line, position.start.column, position.end.line),
      startLine: position.start.line,
    });
  });

  return headings;
};

/**
 * Character count of lines `startLine`..`endLine` inclusive, counting the terminators between them
 * but not the one after the last line. `endLine` is clamped so a range that outruns the line array
 * can never read past its end.
 */
const sliceChars = (source: SourceLines, startLine: number, endLine: number): number => {
  const last = Math.min(endLine, source.lines.length);
  let chars = 0;
  for (let i = startLine - 1; i < last; i++) {
    chars += source.lines[i].length;
    if (i < last - 1) {
      chars += source.separators[i].length;
    }
  }
  return chars;
};

export const parseMarkdownOutline = (body: string): MarkdownOutline => {
  const source = splitSourceLines(body);
  const lines = source.lines;
  const totalLines = lines.length;
  const headings = detectHeadings(body, lines);

  const outline: OutlineEntry[] = headings.map((heading, index) => {
    let endLine = totalLines;
    for (let j = index + 1; j < headings.length; j++) {
      if (headings[j].level <= heading.level) {
        endLine = headings[j].startLine - 1;
        break;
      }
    }
    return { ...heading, endLine, chars: sliceChars(source, heading.startLine, endLine) };
  });

  let preamble: SectionRange | undefined;
  if (outline.length === 0) {
    preamble = { startLine: 1, endLine: totalLines, chars: body.length };
  } else if (outline[0].startLine > 1) {
    const endLine = outline[0].startLine - 1;
    preamble = { startLine: 1, endLine, chars: sliceChars(source, 1, endLine) };
  }

  return { outline, preamble, totalLines, totalChars: body.length };
};

/**
 * Filters an already-parsed outline down to a maximum heading depth, recomputing the preamble so
 * every line stays addressable even when filtering hides the leading heading(s).
 *
 * This is a separate function rather than an extra `parseMarkdownOutline` argument because
 * filtering by depth is a display-time concern specific to `getPageOutline`: `getPageSection`
 * never filters by depth, so threading an argument through `parseMarkdownOutline` would leave it
 * unused there.
 */
export const filterOutlineByDepth = (parsed: MarkdownOutline, maxDepth: number, body: string): MarkdownOutline & { hiddenHeadingCount?: number } => {
  const outline = parsed.outline.filter((entry) => entry.level <= maxDepth);
  const hidden = parsed.outline.length - outline.length;

  let preamble: SectionRange | undefined = parsed.preamble;
  let hiddenHeadingCount: number | undefined;

  if (hidden > 0) {
    hiddenHeadingCount = hidden;
    // Recompute the preamble so every line stays addressable even when filtering hides leading headings
    if (outline.length === 0) {
      preamble = { startLine: 1, endLine: parsed.totalLines, chars: parsed.totalChars };
    } else if (outline[0].startLine > 1) {
      const endLine = outline[0].startLine - 1;
      preamble = { startLine: 1, endLine, chars: sliceChars(splitSourceLines(body), 1, endLine) };
    }
  }

  return { ...parsed, outline, preamble, hiddenHeadingCount };
};

/**
 * Comparison order used to resolve a heading name. Both labels are accepted because both are
 * handed out in the outline: `text` is what a reader sees, `raw` is what an edit has to match.
 * Exact comparisons run before case-insensitive ones so the closest match wins.
 */
const MATCH_STRATEGIES: ReadonlyArray<{ label: 'text' | 'raw'; caseSensitive: boolean }> = [
  { label: 'text', caseSensitive: true },
  { label: 'raw', caseSensitive: true },
  { label: 'text', caseSensitive: false },
  { label: 'raw', caseSensitive: false },
];

const toCandidates = (entries: OutlineEntry[]): Array<{ text: string; raw: string; level: number; startLine: number }> =>
  entries.map(({ text, raw, level, startLine }) => ({ text, raw, level, startLine }));

const findHeading = (outline: OutlineEntry[], heading: string): OutlineEntry => {
  const lowered = heading.toLowerCase();
  let ambiguous: OutlineEntry[] | undefined;

  for (const { label, caseSensitive } of MATCH_STRATEGIES) {
    const matches = outline.filter((entry) => (caseSensitive ? entry[label] === heading : entry[label].toLowerCase() === lowered));
    if (matches.length === 1) {
      return matches[0];
    }
    // Remember the first tie so the reported candidates come from the most precise comparison
    if (matches.length > 1 && ambiguous == null) {
      ambiguous = matches;
    }
  }

  if (ambiguous != null) {
    throw new HeadingMatchError(
      `Heading "${heading}" matches ${ambiguous.length} headings; disambiguate with startLine/endLine instead`,
      'ambiguous',
      toCandidates(ambiguous),
    );
  }
  throw new HeadingMatchError(`Heading "${heading}" was not found in the page`, 'not-found', toCandidates(outline));
};

/**
 * Resolves a heading to its section line range. The name may be either the rendered `text` or the
 * authored `raw` form; exact matches are tried before case-insensitive ones.
 * @throws HeadingMatchError when the heading is not found or matches multiple headings
 */
export const resolveHeadingRange = (
  outline: OutlineEntry[],
  heading: string,
  includeSubsections: boolean,
): { startLine: number; endLine: number; matched: OutlineEntry } => {
  const matched = findHeading(outline, heading);

  if (includeSubsections) {
    return { startLine: matched.startLine, endLine: matched.endLine, matched };
  }

  // Without subsections: stop right before the first deeper heading inside the section
  const firstChild = outline.find((entry) => entry.startLine > matched.startLine && entry.startLine <= matched.endLine);
  const endLine = firstChild != null ? firstChild.startLine - 1 : matched.endLine;
  return { startLine: matched.startLine, endLine, matched };
};
