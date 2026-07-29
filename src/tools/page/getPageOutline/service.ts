import { fetchPageBodyInfo } from '../../../commons/utils/growi-page.js';
import type { MarkdownOutline, SectionRange } from '../../../commons/utils/markdown/parse-outline.js';
import { parseMarkdownOutline } from '../../../commons/utils/markdown/parse-outline.js';
import type { GetPageOutlineParam } from './schema.js';

export type GetPageOutlineParams = Omit<GetPageOutlineParam, 'appName'>;

export interface GetPageOutlineResult extends MarkdownOutline {
  pageId: string;
  path: string;
  revisionId: string;
  updatedAt?: string;
  /** Number of headings hidden by maxDepth (their lines remain addressable via the preamble/parent sections) */
  hiddenHeadingCount?: number;
}

const charsOfLines = (lines: string[], startLine: number, endLine: number): number => {
  let chars = 0;
  for (let i = startLine - 1; i < endLine; i++) {
    chars += lines[i].length;
  }
  return chars + (endLine - startLine);
};

export const getPageOutline = async (params: GetPageOutlineParams, appName: string): Promise<GetPageOutlineResult> => {
  const pageInfo = await fetchPageBodyInfo({ pageId: params.pageId, path: params.path }, appName);
  const parsed = parseMarkdownOutline(pageInfo.body);

  const maxDepth = params.maxDepth;
  let outline = parsed.outline;
  let preamble: SectionRange | undefined = parsed.preamble;
  let hiddenHeadingCount: number | undefined;

  if (maxDepth != null) {
    outline = parsed.outline.filter((entry) => entry.level <= maxDepth);
    const hidden = parsed.outline.length - outline.length;
    if (hidden > 0) {
      hiddenHeadingCount = hidden;
      // Recompute the preamble so every line stays addressable even when filtering hides leading headings
      if (outline.length === 0) {
        preamble = { startLine: 1, endLine: parsed.totalLines, chars: parsed.totalChars };
      } else if (outline[0].startLine > 1) {
        const endLine = outline[0].startLine - 1;
        preamble = { startLine: 1, endLine, chars: charsOfLines(pageInfo.body.split('\n'), 1, endLine) };
      }
    }
  }

  return {
    pageId: pageInfo.pageId,
    path: pageInfo.path,
    revisionId: pageInfo.revisionId,
    updatedAt: pageInfo.updatedAt,
    totalLines: parsed.totalLines,
    totalChars: parsed.totalChars,
    outline,
    preamble,
    unterminatedFence: parsed.unterminatedFence,
    hiddenHeadingCount,
  };
};
