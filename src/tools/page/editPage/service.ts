import apiv3 from '@growi/sdk-typescript/v3';
import { GrowiApiError } from '../../../commons/api/growi-api-error.js';
import type { PageBodyInfo } from '../../../commons/utils/growi-page.js';
import { extractNewRevisionId, fetchPageBodyInfo } from '../../../commons/utils/growi-page.js';
import type { EditResult } from '../../../commons/utils/markdown/apply-string-edits.js';
import { applyStringEdits } from '../../../commons/utils/markdown/apply-string-edits.js';
import { buildUnifiedDiff } from '../../../commons/utils/markdown/build-unified-diff.js';
import type { EditPageParam } from './schema.js';

export type EditPageParams = Omit<EditPageParam, 'appName'>;

export interface EditPageResult {
  pageId: string;
  path: string;
  /**
   * Revision ID the edit was applied on top of. Returned the same way for both dryRun and a
   * normal save, so a dryRun response's baseRevisionId can be passed straight back as
   * expectedRevisionId on the follow-up call.
   */
  baseRevisionId: string;
  /**
   * Revision ID created by the save. Only present after a normal (non-dryRun) save, and omitted
   * (never a stale guess) when the save response did not include the new revision.
   */
  newRevisionId?: string;
  edits: EditResult[];
  totalLines: number;
  totalChars: number;
  dryRun?: boolean;
  /** Unified diff preview (dryRun only) */
  diff?: string;
  /** Set when the edit succeeded after an automatic retry caused by a concurrent update */
  retriedAfterConflict?: boolean;
}

interface BuildEditPageResultOptions {
  dryRun?: true;
  diff?: string;
  newRevisionId?: string;
  retriedAfterConflict?: true;
}

/**
 * Assembles the EditPageResult shared by the dryRun, successful-save, and retried-save paths so
 * totalLines/totalChars are computed in exactly one place (Requirement 6.2).
 */
const buildEditPageResult = (pageInfo: PageBodyInfo, newBody: string, results: EditResult[], options: BuildEditPageResultOptions = {}): EditPageResult => {
  const { dryRun, diff, newRevisionId, retriedAfterConflict } = options;
  return {
    pageId: pageInfo.pageId,
    path: pageInfo.path,
    baseRevisionId: pageInfo.revisionId,
    edits: results,
    totalLines: newBody.split('\n').length,
    totalChars: newBody.length,
    ...(dryRun === true ? { dryRun: true, diff } : {}),
    ...(newRevisionId != null ? { newRevisionId } : {}),
    ...(retriedAfterConflict === true ? { retriedAfterConflict: true } : {}),
  };
};

const CONFLICT_MESSAGE_PATTERN = /revisionId.*outdated|outdated.*revisionId/i;

/**
 * Detects GROWI's optimistic-lock rejection on putPage. GROWI signals it as HTTP 409 with
 * `errors: [{ message: 'Posted param "revisionId" is outdated.', code: 'conflict' }]`
 * (apps/app/src/server/routes/apiv3/page/update-page.ts); the 400 branch is defense in depth.
 * Deliberately narrow: unrelated errors that merely contain the word "conflict" must not trigger a retry.
 */
const isRevisionOutdatedError = (error: unknown): boolean => {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response;
  if (response == null) {
    return false;
  }
  if (response.status === 409) {
    return true;
  }
  if (response.status !== 400) {
    return false;
  }
  const errors = (response.data as { errors?: Array<{ code?: string; message?: string }> })?.errors;
  if (!Array.isArray(errors)) {
    return false;
  }
  return errors.some((item) => item?.code === 'conflict' || CONFLICT_MESSAGE_PATTERN.test(item?.message ?? ''));
};

const applyEditsToLatest = async (params: EditPageParams, appName: string): Promise<{ pageInfo: PageBodyInfo; newBody: string; results: EditResult[] }> => {
  const pageInfo = await fetchPageBodyInfo({ pageId: params.pageId, path: params.path }, appName);

  if (params.expectedRevisionId != null && params.expectedRevisionId !== pageInfo.revisionId) {
    throw new GrowiApiError('The page has been modified since it was read (revision mismatch). Re-read the page and retry.', 409, {
      expectedRevisionId: params.expectedRevisionId,
      currentRevisionId: pageInfo.revisionId,
    });
  }

  const { body: newBody, results } = applyStringEdits(pageInfo.body, params.edits);
  return { pageInfo, newBody, results };
};

const putPageBody = async (pageInfo: PageBodyInfo, body: string, appName: string) => {
  try {
    return await apiv3.putPage(
      {
        pageId: pageInfo.pageId,
        revisionId: pageInfo.revisionId,
        body,
        // Pass the WIP status through so an edit never accidentally publishes a WIP page.
        // `origin` is deliberately omitted: GROWI skips the revision conflict check entirely
        // when origin is 'editor' (Page.isUpdatable), which would allow silent overwrites.
        ...(pageInfo.wip === true ? { wip: true } : {}),
      },
      { appName },
    );
  } catch (error) {
    if (isRevisionOutdatedError(error)) {
      throw error; // handled by the caller's retry logic
    }
    // Do NOT attach the raw error object: axios errors carry request config incl. the Authorization header
    const response = (error as { response?: { status?: number; data?: unknown } })?.response;
    const message = error instanceof Error ? error.message : String(error);
    throw new GrowiApiError(`Failed to save page: ${message}`, response?.status ?? 500, {
      pageId: pageInfo.pageId,
      responseData: response?.data,
    });
  }
};

/**
 * Applies string edits to a page: fetch latest body -> apply edits -> save via putPage.
 *
 * Concurrency: the revisionId used for the optimistic lock is fetched internally right before saving.
 * When GROWI rejects the save because of a concurrent update, the edits are re-applied against the
 * fresh body and saved once more (single retry). The retry is skipped when expectedRevisionId is set
 * (strict mode) or when any edit uses replaceAll (a blind re-apply could match text the caller never
 * saw). If an edit no longer matches after the concurrent update, the operation aborts without writing.
 */
export const editPage = async (params: EditPageParams, appName: string): Promise<EditPageResult> => {
  const { pageInfo, newBody, results } = await applyEditsToLatest(params, appName);

  if (params.dryRun === true) {
    return buildEditPageResult(pageInfo, newBody, results, {
      dryRun: true,
      diff: buildUnifiedDiff(pageInfo.body, newBody, pageInfo.path || 'page'),
    });
  }

  try {
    const result = await putPageBody(pageInfo, newBody, appName);
    return buildEditPageResult(pageInfo, newBody, results, { newRevisionId: extractNewRevisionId(result) });
  } catch (error) {
    if (!isRevisionOutdatedError(error)) {
      throw error;
    }

    const canRetry = params.expectedRevisionId == null && !params.edits.some((edit) => edit.replaceAll === true);
    if (!canRetry) {
      throw new GrowiApiError('The page was updated concurrently while saving. Re-read the page and retry.', 409, {
        pageId: pageInfo.pageId,
      });
    }

    // The page was updated concurrently between our read and write.
    // Retry once: re-fetch, re-apply the same edits, save with the fresh revisionId.
    // applyStringEdits throws EditMatchError when the concurrent update touched the edited region.
    const retry = await applyEditsToLatest(params, appName);
    let result: Awaited<ReturnType<typeof putPageBody>>;
    try {
      result = await putPageBody(retry.pageInfo, retry.newBody, appName);
    } catch (retryError) {
      if (isRevisionOutdatedError(retryError)) {
        throw new GrowiApiError('The page is being updated concurrently; aborted after one retry. Re-read the page and try again.', 409, {
          pageId: retry.pageInfo.pageId,
        });
      }
      throw retryError;
    }
    return buildEditPageResult(retry.pageInfo, retry.newBody, retry.results, {
      newRevisionId: extractNewRevisionId(result),
      retriedAfterConflict: true,
    });
  }
};
