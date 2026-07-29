import apiv3 from '@growi/sdk-typescript/v3';
import { GrowiApiError } from '../api/growi-api-error.js';

/**
 * Helpers around the GROWI page response shape.
 *
 * Note: the generated SDK types declare `Page.revision` as `string`, but at runtime the
 * `/page` endpoint returns a populated revision object (including `body`). These helpers
 * perform the runtime narrowing in one place.
 */

interface PopulatedRevision {
  _id: string;
  body: string;
}

export interface PageBodyInfo {
  pageId: string;
  path: string;
  revisionId: string;
  body: string;
  updatedAt?: string;
  /** Work-in-progress status of the page (passed through on writes so an edit never publishes a WIP page) */
  wip?: boolean;
}

const isPopulatedRevision = (revision: unknown): revision is PopulatedRevision => {
  return (
    typeof revision === 'object' &&
    revision != null &&
    typeof (revision as { _id?: unknown })._id === 'string' &&
    typeof (revision as { body?: unknown }).body === 'string'
  );
};

/**
 * Extracts the markdown body and revision ID from a page document (pure; unit-testable).
 * @throws GrowiApiError when the revision is not populated with a body
 */
export const extractPageBodyInfo = (page: unknown): PageBodyInfo => {
  const pageRecord = (page ?? {}) as Record<string, unknown>;
  const revision = pageRecord.revision;

  if (typeof pageRecord._id !== 'string' || !isPopulatedRevision(revision)) {
    throw new GrowiApiError('Page response did not include a populated revision body', 500, {
      pageId: pageRecord._id,
      revisionType: typeof revision,
    });
  }

  return {
    pageId: pageRecord._id,
    path: typeof pageRecord.path === 'string' ? pageRecord.path : '',
    revisionId: revision._id,
    body: revision.body,
    updatedAt: typeof pageRecord.updatedAt === 'string' ? pageRecord.updatedAt : undefined,
    wip: typeof pageRecord.wip === 'boolean' ? pageRecord.wip : undefined,
  };
};

/**
 * Extracts the revision ID created by a putPage/postPage call from its response.
 * Returns undefined (rather than a stale guess) when the response carries no revision.
 */
export const extractNewRevisionId = (result: { revision?: unknown; page?: unknown } | null | undefined): string | undefined => {
  const revision = result?.revision;
  if (typeof revision === 'object' && revision != null && typeof (revision as { _id?: unknown })._id === 'string') {
    return (revision as { _id: string })._id;
  }
  const pageRevision = (result?.page as { revision?: unknown } | undefined)?.revision;
  if (typeof pageRevision === 'string') {
    return pageRevision;
  }
  if (typeof pageRevision === 'object' && pageRevision != null && typeof (pageRevision as { _id?: unknown })._id === 'string') {
    return (pageRevision as { _id: string })._id;
  }
  return undefined;
};

/**
 * Fetches the latest body and revision ID of a page by pageId or path.
 * API failures are normalized to GrowiApiError; the raw error object is never propagated
 * (axios errors carry the request config including the Authorization header).
 */
export const fetchPageBodyInfo = async (params: { pageId?: string; path?: string }, appName: string): Promise<PageBodyInfo> => {
  let response: Awaited<ReturnType<typeof apiv3.getPage>>;
  try {
    response = await apiv3.getPage({ pageId: params.pageId, path: params.path }, { appName });
  } catch (error) {
    const errorResponse = (error as { response?: { status?: number; data?: unknown } })?.response;
    const message = error instanceof Error ? error.message : String(error);
    throw new GrowiApiError(`Failed to fetch page: ${message}`, errorResponse?.status ?? 500, {
      pageId: params.pageId,
      path: params.path,
      responseData: errorResponse?.data,
    });
  }

  if (response?.page == null) {
    throw new GrowiApiError('Page was not found', 404, { pageId: params.pageId, path: params.path });
  }

  return extractPageBodyInfo(response.page);
};

const toUserSummary = (user: unknown): unknown => {
  if (typeof user !== 'object' || user == null) {
    return user;
  }
  const record = user as Record<string, unknown>;
  return { _id: record._id, username: record.username };
};

/**
 * Trims a populated revision document for LLM-facing responses: the body (a full copy of the
 * page content) is replaced with `bodyLength`, and the author is reduced to `{ _id, username }`.
 */
export const trimRevisionForResponse = (revision: unknown): unknown => {
  if (typeof revision !== 'object' || revision == null) {
    return revision;
  }
  const { body, author, ...rest } = revision as Record<string, unknown>;
  return {
    ...rest,
    bodyLength: typeof body === 'string' ? body.length : undefined,
    ...(author != null ? { author: toUserSummary(author) } : {}),
  };
};

/**
 * Trims token-heavy fields from a page document before returning it to the LLM:
 * unbounded user-ID arrays become counts, and user objects are reduced to `{ _id, username }`.
 * The revision body is kept only when `keepBody` is true (otherwise `bodyLength` is returned).
 */
export const trimPageForResponse = (page: unknown, options: { keepBody: boolean }): unknown => {
  if (typeof page !== 'object' || page == null) {
    return page;
  }

  const { seenUsers, grantedUsers, liker, creator, lastUpdateUser, deleteUser, revision, ...rest } = page as Record<string, unknown>;
  const trimmed: Record<string, unknown> = { ...rest };

  if (Array.isArray(seenUsers)) trimmed.seenUsersCount = seenUsers.length;
  if (Array.isArray(grantedUsers)) trimmed.grantedUsersCount = grantedUsers.length;
  if (Array.isArray(liker)) trimmed.likerCount = liker.length;
  if (creator != null) trimmed.creator = toUserSummary(creator);
  if (lastUpdateUser != null) trimmed.lastUpdateUser = toUserSummary(lastUpdateUser);
  if (deleteUser != null) trimmed.deleteUser = toUserSummary(deleteUser);

  if (typeof revision === 'string' || revision == null) {
    trimmed.revision = revision;
  } else if (options.keepBody) {
    const { author, ...revisionRest } = revision as Record<string, unknown>;
    trimmed.revision = {
      ...revisionRest,
      ...(author != null ? { author: toUserSummary(author) } : {}),
    };
  } else {
    trimmed.revision = trimRevisionForResponse(revision);
  }

  return trimmed;
};
