import { fetchPageBodyInfo, trimPageForResponse } from '../../../commons/utils/growi-page.js';
import type { MarkdownOutline } from '../../../commons/utils/markdown/parse-outline.js';
import { filterOutlineByDepth, parseMarkdownOutline } from '../../../commons/utils/markdown/parse-outline.js';
import type { GetPageOutlineParam } from './schema.js';

export type GetPageOutlineParams = Omit<GetPageOutlineParam, 'appName'>;

export interface GetPageOutlineResult extends MarkdownOutline {
  pageId: string;
  path: string;
  revisionId: string;
  updatedAt?: string;
  /** Number of headings hidden by maxDepth (their lines remain addressable via the preamble/parent sections) */
  hiddenHeadingCount?: number;
  /**
   * Page metadata (parent, grant, grantedUsers, tags, etc.), trimmed the same way as
   * getPageWholeContents but without the body. fetchPageBodyInfo already retrieved the whole page
   * document, so this costs no extra GROWI API call; it only widens what gets formatted from it.
   */
  page: unknown;
}

export const getPageOutline = async (params: GetPageOutlineParams, appName: string): Promise<GetPageOutlineResult> => {
  const pageInfo = await fetchPageBodyInfo({ pageId: params.pageId, path: params.path }, appName);
  const parsed = parseMarkdownOutline(pageInfo.body);

  // Depth filtering (and the preamble recompute it implies) is delegated to parse-outline.ts so
  // the logic and its char-counting exist in one place. The body is split here, once, only when
  // filtering actually needs the raw lines; the unfiltered path never re-splits it.
  const filtered: MarkdownOutline & { hiddenHeadingCount?: number } =
    params.maxDepth != null ? filterOutlineByDepth(parsed, params.maxDepth, pageInfo.body.split('\n')) : parsed;

  return {
    pageId: pageInfo.pageId,
    path: pageInfo.path,
    revisionId: pageInfo.revisionId,
    updatedAt: pageInfo.updatedAt,
    totalLines: filtered.totalLines,
    totalChars: filtered.totalChars,
    outline: filtered.outline,
    preamble: filtered.preamble,
    hiddenHeadingCount: filtered.hiddenHeadingCount,
    page: trimPageForResponse(pageInfo.page, { keepBody: false }),
  };
};
