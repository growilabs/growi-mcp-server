import apiv3 from '@growi/sdk-typescript/v3';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';
import { GrowiApiError } from '../api/growi-api-error.js';
import { extractNewRevisionId, extractPageBodyInfo, fetchPageBodyInfo, trimPageForResponse, trimRevisionForResponse } from './growi-page.js';

vi.mock('@growi/sdk-typescript/v3', () => ({ default: { getPage: vi.fn() } }));

const mockedGetPage = apiv3.getPage as unknown as Mock;

describe('extractPageBodyInfo', () => {
  it('extracts body and revision ID from a populated revision object', () => {
    const page = {
      _id: 'page1',
      path: '/wiki/test',
      updatedAt: '2026-07-29T00:00:00.000Z',
      revision: { _id: 'rev1', body: '# Hello' },
    };

    expect(extractPageBodyInfo(page)).toEqual({
      pageId: 'page1',
      path: '/wiki/test',
      revisionId: 'rev1',
      body: '# Hello',
      updatedAt: '2026-07-29T00:00:00.000Z',
    });
  });

  it('throws GrowiApiError when revision is only an ID string (not populated)', () => {
    expect(() => extractPageBodyInfo({ _id: 'page1', revision: 'rev1' })).toThrow(GrowiApiError);
  });

  it('throws GrowiApiError for null or malformed pages', () => {
    expect(() => extractPageBodyInfo(null)).toThrow(GrowiApiError);
    expect(() => extractPageBodyInfo({ revision: { _id: 'rev1', body: 'x' } })).toThrow(GrowiApiError);
  });
});

describe('trimPageForResponse', () => {
  const page = {
    _id: 'page1',
    path: '/wiki/test',
    seenUsers: ['u1', 'u2', 'u3'],
    grantedUsers: ['u1'],
    liker: [],
    creator: { _id: 'u1', username: 'alice', email: 'secret@example.com', apiToken: 'xxx' },
    lastUpdateUser: { _id: 'u2', username: 'bob', password: 'hash' },
    revision: { _id: 'rev1', body: '# Body content', author: { _id: 'u2', username: 'bob', email: 'x@y.z' }, createdAt: '2026-07-29', hasDiffToPrev: true },
  };

  it('replaces unbounded user arrays with counts and reduces user objects', () => {
    const trimmed = trimPageForResponse(page, { keepBody: true }) as Record<string, unknown>;

    expect(trimmed.seenUsers).toBeUndefined();
    expect(trimmed.seenUsersCount).toBe(3);
    expect(trimmed.grantedUsersCount).toBe(1);
    expect(trimmed.likerCount).toBe(0);
    expect(trimmed.creator).toEqual({ _id: 'u1', username: 'alice' });
    expect(trimmed.lastUpdateUser).toEqual({ _id: 'u2', username: 'bob' });
  });

  it('keeps the revision body when keepBody is true', () => {
    const trimmed = trimPageForResponse(page, { keepBody: true }) as { revision: Record<string, unknown> };

    expect(trimmed.revision.body).toBe('# Body content');
    expect(trimmed.revision._id).toBe('rev1');
    expect(trimmed.revision.author).toEqual({ _id: 'u2', username: 'bob' });
    expect(trimmed.revision.hasDiffToPrev).toBe(true);
  });

  it('replaces the revision body with bodyLength when keepBody is false', () => {
    const trimmed = trimPageForResponse(page, { keepBody: false }) as { revision: Record<string, unknown> };

    expect(trimmed.revision.body).toBeUndefined();
    expect(trimmed.revision.bodyLength).toBe('# Body content'.length);
  });

  it('passes through a string revision unchanged', () => {
    const trimmed = trimPageForResponse({ _id: 'p', revision: 'rev1' }, { keepBody: true }) as Record<string, unknown>;
    expect(trimmed.revision).toBe('rev1');
  });

  it('returns non-object input unchanged', () => {
    expect(trimPageForResponse(null, { keepBody: true })).toBeNull();
    expect(trimPageForResponse(undefined, { keepBody: true })).toBeUndefined();
  });
});

describe('fetchPageBodyInfo', () => {
  it('normalizes API failures into GrowiApiError carrying only status and response data', async () => {
    mockedGetPage.mockRejectedValueOnce(
      Object.assign(new Error('Not Found'), {
        config: { headers: { Authorization: 'Bearer SECRET' } },
        response: { status: 404, data: { code: 'page-not-found' } },
      }),
    );

    expect.assertions(3);
    try {
      await fetchPageBodyInfo({ pageId: 'missing' }, 'default');
    } catch (error) {
      expect(error).toBeInstanceOf(GrowiApiError);
      expect((error as GrowiApiError).statusCode).toBe(404);
      expect(JSON.stringify((error as GrowiApiError).details)).not.toContain('SECRET');
    }
  });

  it('throws a 404 GrowiApiError when the response has no page', async () => {
    mockedGetPage.mockResolvedValueOnce({ page: null });

    await expect(fetchPageBodyInfo({ path: '/none' }, 'default')).rejects.toMatchObject({ name: 'GrowiApiError', statusCode: 404 });
  });
});

describe('trimRevisionForResponse', () => {
  it('replaces the body with bodyLength and reduces the author, keeping other fields', () => {
    const trimmed = trimRevisionForResponse({
      _id: 'rev1',
      body: 'content',
      author: { _id: 'u1', username: 'alice', email: 'x@y.z' },
      hasDiffToPrev: true,
      createdAt: '2026-07-29',
    }) as Record<string, unknown>;

    expect(trimmed).toEqual({
      _id: 'rev1',
      bodyLength: 7,
      author: { _id: 'u1', username: 'alice' },
      hasDiffToPrev: true,
      createdAt: '2026-07-29',
    });
  });

  it('returns non-object input unchanged', () => {
    expect(trimRevisionForResponse('rev1')).toBe('rev1');
    expect(trimRevisionForResponse(null)).toBeNull();
  });
});

describe('extractNewRevisionId', () => {
  it('prefers the revision object of the response', () => {
    expect(extractNewRevisionId({ revision: { _id: 'rev2' }, page: { revision: 'rev1' } })).toBe('rev2');
  });

  it('falls back to the page revision (string or populated object)', () => {
    expect(extractNewRevisionId({ page: { revision: 'rev2' } })).toBe('rev2');
    expect(extractNewRevisionId({ page: { revision: { _id: 'rev2', body: 'x' } } })).toBe('rev2');
  });

  it('returns undefined instead of guessing when no revision is present', () => {
    expect(extractNewRevisionId({ page: { _id: 'p1' } })).toBeUndefined();
    expect(extractNewRevisionId(undefined)).toBeUndefined();
  });
});
