/**
 * Parses the heading outline of a markdown document.
 *
 * Heading detection is delegated to remark (`remark-parse` + `remark-frontmatter`), the same parser
 * GROWI renders pages with, so the outline lists exactly the headings a reader sees. Section
 * boundaries, the preamble range and character counts are this repository's own contract and are
 * computed here: the syntax tree does not carry them.
 *
 * Positions are taken from the tree as character offsets, so this module builds no line array of
 * its own. That matters beyond brevity: when line numbers came from the tree while the text they
 * addressed was sliced out of a locally built line array, the two coordinate systems could
 * disagree — a bare `\r` is a line ending to the parser but not to `split('\n')`, and the usual
 * `replace(/\r\n/g, '\n')` normalization leaves those behind — and one heading's line number was
 * reported against another heading's text.
 *
 * `splitLines` is exported for the one place that still has to turn a line number back into text
 * (`getPageSection`), and it splits on the same set of line endings the parser counts.
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
  /**
   * Character count of the section's own text (heading line through endLine), excluding the line
   * ending that separates it from what follows. A section therefore reports the same size whether
   * or not the body happens to end with a newline; use `totalChars` for the length of the whole body.
   */
  chars: number;
}

export interface SectionRange {
  startLine: number;
  endLine: number;
  /** See `OutlineEntry.chars` */
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
/** The `===`/`---` line that closes a setext heading, which the node's source slice ends with */
const SETEXT_UNDERLINE_PATTERN = /(\r\n|\r|\n)[^\r\n]*$/;

const LINE_ENDING_PATTERN = /\r\n|\r|\n/;

/**
 * Line contents of a body, split on every CommonMark line ending so line `n` here is line `n` of
 * the syntax tree. Exported because `getPageSection` resolves the line numbers this module reports
 * back into text, and the two must agree on what ends a line.
 */
export const splitLines = (body: string): string[] => body.split(new RegExp(LINE_ENDING_PATTERN, 'g'));

/**
 * Character count of the source between two offsets, minus the line ending that separates it from
 * whatever follows. Offsets come straight from the syntax tree, so no line array is needed.
 */
const charsBetween = (body: string, start: number, end: number): number => {
  let stop = Math.min(end, body.length);
  if (stop > start && body[stop - 1] === '\n') {
    stop -= 1;
  }
  if (stop > start && body[stop - 1] === '\r') {
    stop -= 1;
  }
  return Math.max(0, stop - start);
};

/** Characters of lines 1..`endLine`, which is exactly the offset of that line's own terminator. */
const charsUpToLine = (body: string, endLine: number): number => {
  const pattern = new RegExp(LINE_ENDING_PATTERN, 'g');
  let seen = 0;
  let match = pattern.exec(body);
  while (match != null) {
    if (++seen === endLine) {
      return match.index;
    }
    match = pattern.exec(body);
  }
  return body.length;
};

interface DetectedHeading {
  level: number;
  text: string;
  raw: string;
  startLine: number;
  startOffset: number;
}

/**
 * Collects headings from the syntax tree.
 *
 * `raw` is the heading's own source text, taken by offset. The tree only keeps rendered text, and
 * slicing by offset — rather than by line and column — means the result is always a literal
 * substring of the body, which is what an `editPage` oldString has to be. Container markers
 * (blockquote `>`, list bullets) fall outside the node, so they need no stripping; only the ATX
 * marker and its optional closing sequence do. A setext heading's slice ends with its underline,
 * so that last line comes off.
 *
 * Headings whose label renders empty (`#` on its own) are kept. Dropping them would silently fold
 * their lines into the preceding section, and the outline is meant to mirror the document structure.
 */
const detectHeadings = (tree: ReturnType<typeof processor.parse>, body: string): DetectedHeading[] => {
  const headings: DetectedHeading[] = [];

  visit(tree, 'heading', (node) => {
    // The braces matter: a callback returning a number is read by unist-util-visit as the index to
    // continue from, and `push` returns the new length, which makes it revisit the same node.
    const position = node.position;
    if (position?.start.offset == null || position.end.offset == null) {
      return;
    }
    const source = body.slice(position.start.offset, position.end.offset);
    const isSetext = position.end.line > position.start.line;
    const raw = isSetext ? source.replace(SETEXT_UNDERLINE_PATTERN, '').trim() : source.replace(ATX_MARKER_PATTERN, '').replace(ATX_CLOSING_PATTERN, '').trim();

    headings.push({
      level: node.depth,
      text: renderHeadingText(node),
      raw,
      startLine: position.start.line,
      startOffset: position.start.offset,
    });
  });

  return headings;
};

export const parseMarkdownOutline = (body: string): MarkdownOutline => {
  const tree = processor.parse(body);
  // The tree counts line endings the same way splitLines does, so this needs no line array
  const totalLines = tree.position?.end.line ?? 1;
  const headings = detectHeadings(tree, body);

  const outline: OutlineEntry[] = headings.map(({ startOffset, ...heading }, index) => {
    let endLine = totalLines;
    let endOffset = body.length;
    for (let j = index + 1; j < headings.length; j++) {
      if (headings[j].level <= heading.level) {
        endLine = headings[j].startLine - 1;
        endOffset = headings[j].startOffset;
        break;
      }
    }
    return { ...heading, endLine, chars: charsBetween(body, startOffset, endOffset) };
  });

  let preamble: SectionRange | undefined;
  if (outline.length === 0) {
    preamble = { startLine: 1, endLine: totalLines, chars: body.length };
  } else if (outline[0].startLine > 1) {
    const endLine = outline[0].startLine - 1;
    preamble = { startLine: 1, endLine, chars: charsUpToLine(body, endLine) };
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
      preamble = { startLine: 1, endLine, chars: charsUpToLine(body, endLine) };
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
