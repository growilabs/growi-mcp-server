import { GrowiApiError } from '../../../commons/api/growi-api-error.js';
import { fetchPageBodyInfo } from '../../../commons/utils/growi-page.js';
import { parseMarkdownOutline, resolveHeadingRange, splitLines } from '../../../commons/utils/markdown/parse-outline.js';
import type { GetPageSectionParam } from './schema.js';

const DEFAULT_MAX_CHARS = 20000;

export type GetPageSectionParams = Omit<GetPageSectionParam, 'appName'>;

export interface GetPageSectionResult {
  pageId: string;
  path: string;
  revisionId: string;
  startLine: number;
  endLine: number;
  totalLines: number;
  matchedHeading?: { text: string; level: number };
  truncated: boolean;
  /** The end of the requested range (echoed so a follow-up read can reuse it); present only when truncated */
  requestedEndLine?: number;
  /** When truncated at a line boundary, continue reading from this line */
  nextStartLine?: number;
  /**
   * True when a single line longer than maxChars was cut mid-line. nextStartLine is omitted in
   * that case: the remainder of the line is only reachable with a larger maxChars or via getPage.
   */
  lineTruncated?: boolean;
  body: string;
}

export const getPageSection = async (params: GetPageSectionParams, appName: string): Promise<GetPageSectionResult> => {
  const pageInfo = await fetchPageBodyInfo({ pageId: params.pageId, path: params.path }, appName);
  // Split through parse-outline so the line numbers here mean the same thing as the ones
  // getPageOutline hands out (both count every CommonMark line ending, not just `\n`)
  const lines = splitLines(pageInfo.body);
  const totalLines = lines.length;

  let startLine: number;
  let endLine: number;
  let matchedHeading: { text: string; level: number } | undefined;

  if (params.heading != null) {
    const { outline } = parseMarkdownOutline(pageInfo.body);
    const range = resolveHeadingRange(outline, params.heading, params.includeSubsections ?? true);
    startLine = range.startLine;
    endLine = range.endLine;
    matchedHeading = { text: range.matched.text, level: range.matched.level };
  } else {
    startLine = params.startLine ?? 1;
    if (startLine > totalLines) {
      throw new GrowiApiError(`startLine (${startLine}) exceeds the total number of lines (${totalLines})`, 400, { totalLines });
    }
    endLine = Math.min(params.endLine ?? totalLines, totalLines);
    if (endLine < startLine) {
      throw new GrowiApiError(`endLine (${endLine}) must not be smaller than startLine (${startLine})`, 400, { totalLines });
    }
  }

  // Cut at a line boundary when the requested range exceeds maxChars
  const maxChars = params.maxChars ?? DEFAULT_MAX_CHARS;
  const includedLines: string[] = [];
  let chars = 0;
  let lastIncludedLine = startLine - 1;
  let lineTruncated = false;
  for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
    const line = lines[lineNumber - 1];
    if (includedLines.length === 0 && line.length > maxChars) {
      // A single line longer than maxChars: hard-cut it so maxChars is always honored
      includedLines.push(line.slice(0, maxChars));
      lastIncludedLine = lineNumber;
      lineTruncated = true;
      break;
    }
    const cost = line.length + (includedLines.length > 0 ? 1 : 0); // +1 for the joining newline
    if (includedLines.length > 0 && chars + cost > maxChars) {
      break;
    }
    includedLines.push(line);
    chars += cost;
    lastIncludedLine = lineNumber;
  }
  const truncated = lineTruncated || lastIncludedLine < endLine;

  return {
    pageId: pageInfo.pageId,
    path: pageInfo.path,
    revisionId: pageInfo.revisionId,
    startLine,
    endLine: lastIncludedLine,
    totalLines,
    matchedHeading,
    truncated,
    requestedEndLine: truncated ? endLine : undefined,
    nextStartLine: truncated && !lineTruncated ? lastIncludedLine + 1 : undefined,
    lineTruncated: lineTruncated || undefined,
    body: includedLines.join('\n'),
  };
};
