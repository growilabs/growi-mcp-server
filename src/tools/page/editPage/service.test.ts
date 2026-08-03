import apiv3 from '@growi/sdk-typescript/v3';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GrowiApiError } from '../../../commons/api/growi-api-error.js';
import { EditMatchError } from '../../../commons/utils/markdown/apply-string-edits.js';
import { editPage } from './service.js';

vi.mock('@growi/sdk-typescript/v3', () => ({
  default: {
    getPage: vi.fn(),
    putPage: vi.fn(),
  },
}));

const mockedGetPage = apiv3.getPage as unknown as Mock;
const mockedPutPage = apiv3.putPage as unknown as Mock;

const pageResponse = (body: string, revisionId: string, extra: Record<string, unknown> = {}) => ({
  page: {
    _id: 'page1',
    path: '/wiki/test',
    updatedAt: '2026-07-29T00:00:00.000Z',
    revision: { _id: revisionId, body },
    ...extra,
  },
});

const outdatedError = (status: 400 | 409 = 409) => ({
  response: { status, data: { errors: [{ message: "Posted param 'revisionId' is outdated." }] } },
});

describe('editPage service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches the latest revision, applies edits and saves with the fetched revisionId', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev1'));
    mockedPutPage.mockResolvedValue({ page: { _id: 'page1', path: '/wiki/test' }, revision: { _id: 'rev2' } });

    const result = await editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'GROWI' }] }, 'default');

    expect(mockedPutPage).toHaveBeenCalledWith({ pageId: 'page1', revisionId: 'rev1', body: 'hello GROWI' }, { appName: 'default' });
    expect(result).toMatchObject({
      pageId: 'page1',
      path: '/wiki/test',
      newRevisionId: 'rev2',
      edits: [{ replacements: 1 }],
      totalChars: 'hello GROWI'.length,
    });
    expect(result.retriedAfterConflict).toBeUndefined();
  });

  it('does not write anything and returns a unified diff on dryRun', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev1'));

    const result = await editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'GROWI' }], dryRun: true }, 'default');

    expect(mockedPutPage).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.baseRevisionId).toBe('rev1');
    expect(result.diff).toContain('-hello world');
    expect(result.diff).toContain('+hello GROWI');
  });

  it('fails without writing when expectedRevisionId does not match the head revision', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev2'));

    await expect(editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'x' }], expectedRevisionId: 'rev1' }, 'default')).rejects.toThrow(
      GrowiApiError,
    );
    expect(mockedPutPage).not.toHaveBeenCalled();
  });

  it('aborts the whole edit batch without saving when a later edit does not match (all-or-nothing)', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev1'));

    await expect(
      editPage(
        {
          pageId: 'page1',
          edits: [
            { oldString: 'hello', newString: 'hi' },
            { oldString: 'missing', newString: 'x' },
          ],
        },
        'default',
      ),
    ).rejects.toThrow(EditMatchError);
    expect(mockedPutPage).not.toHaveBeenCalled();
  });

  it('retries once after a concurrent update and succeeds when the edit still applies', async () => {
    mockedGetPage.mockResolvedValueOnce(pageResponse('hello world', 'rev1')).mockResolvedValueOnce(pageResponse('intro added\nhello world', 'rev2'));
    // GROWI signals the outdated revision as a 400 with a specific message; the retry logic must recognize it
    mockedPutPage.mockRejectedValueOnce(outdatedError(400)).mockResolvedValueOnce({ page: { _id: 'page1', path: '/wiki/test' }, revision: { _id: 'rev3' } });

    const result = await editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'GROWI' }] }, 'default');

    expect(mockedGetPage).toHaveBeenCalledTimes(2);
    expect(mockedPutPage).toHaveBeenCalledTimes(2);
    expect(mockedPutPage).toHaveBeenLastCalledWith({ pageId: 'page1', revisionId: 'rev2', body: 'intro added\nhello GROWI' }, { appName: 'default' });
    expect(result.newRevisionId).toBe('rev3');
    expect(result.retriedAfterConflict).toBe(true);
  });

  it('aborts the retry when the concurrent update removed the edited text', async () => {
    mockedGetPage.mockResolvedValueOnce(pageResponse('hello world', 'rev1')).mockResolvedValueOnce(pageResponse('completely rewritten', 'rev2'));
    mockedPutPage.mockRejectedValueOnce(outdatedError());

    await expect(editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'GROWI' }] }, 'default')).rejects.toThrow(EditMatchError);
    expect(mockedPutPage).toHaveBeenCalledTimes(1);
  });

  it('gives up with a conflict error when the retry also hits a concurrent update', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev1'));
    mockedPutPage.mockRejectedValue(outdatedError());

    await expect(editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'GROWI' }] }, 'default')).rejects.toMatchObject({
      name: 'GrowiApiError',
      statusCode: 409,
    });
    expect(mockedPutPage).toHaveBeenCalledTimes(2);
  });

  it('throws when the page response revision is not populated with a body', async () => {
    mockedGetPage.mockResolvedValue({ page: { _id: 'page1', path: '/wiki/test', revision: 'rev1' } });

    await expect(editPage({ pageId: 'page1', edits: [{ oldString: 'a', newString: 'b' }] }, 'default')).rejects.toThrow(GrowiApiError);
    expect(mockedPutPage).not.toHaveBeenCalled();
  });

  it('wraps non-conflict save failures into GrowiApiError without retrying', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev1'));
    mockedPutPage.mockRejectedValue(Object.assign(new Error('Forbidden'), { response: { status: 403, data: {} } }));

    await expect(editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'x' }] }, 'default')).rejects.toMatchObject({
      name: 'GrowiApiError',
      statusCode: 403,
    });
    expect(mockedPutPage).toHaveBeenCalledTimes(1);
  });

  it('does not treat an unrelated 400 mentioning "conflicted" as a revision conflict', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev1'));
    mockedPutPage.mockRejectedValue({ response: { status: 400, data: { errors: [{ message: 'grant is conflicted with the ancestor page' }] } } });

    await expect(editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'x' }] }, 'default')).rejects.toMatchObject({
      name: 'GrowiApiError',
      statusCode: 400,
    });
    expect(mockedPutPage).toHaveBeenCalledTimes(1);
  });

  it('does not leak the underlying error object (and its request config) into error details', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev1'));
    const axiosLikeError = Object.assign(new Error('Request failed'), {
      config: { headers: { Authorization: 'Bearer SECRET' } },
      response: { status: 500, data: { message: 'internal' } },
    });
    mockedPutPage.mockRejectedValue(axiosLikeError);

    expect.assertions(2);
    try {
      await editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'x' }] }, 'default');
    } catch (error) {
      expect((error as GrowiApiError).details).toEqual({ pageId: 'page1', responseData: { message: 'internal' } });
      expect(JSON.stringify((error as GrowiApiError).details)).not.toContain('SECRET');
    }
  });

  it('wraps network errors without a response into GrowiApiError 500 without retrying', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev1'));
    mockedPutPage.mockRejectedValue(new Error('ECONNRESET'));

    await expect(editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'x' }] }, 'default')).rejects.toMatchObject({
      name: 'GrowiApiError',
      statusCode: 500,
    });
    expect(mockedPutPage).toHaveBeenCalledTimes(1);
  });

  it('skips the conflict retry when any edit uses replaceAll', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world world', 'rev1'));
    mockedPutPage.mockRejectedValue(outdatedError());

    await expect(editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'GROWI', replaceAll: true }] }, 'default')).rejects.toMatchObject({
      name: 'GrowiApiError',
      statusCode: 409,
    });
    expect(mockedPutPage).toHaveBeenCalledTimes(1);
  });

  it('skips the conflict retry in strict mode (expectedRevisionId)', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev1'));
    mockedPutPage.mockRejectedValue(outdatedError());

    await expect(
      editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'GROWI' }], expectedRevisionId: 'rev1' }, 'default'),
    ).rejects.toMatchObject({ name: 'GrowiApiError', statusCode: 409 });
    expect(mockedPutPage).toHaveBeenCalledTimes(1);
    expect(mockedGetPage).toHaveBeenCalledTimes(1);
  });

  it('passes the WIP status through so an edit does not publish a WIP page', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev1', { wip: true }));
    mockedPutPage.mockResolvedValue({ page: { _id: 'page1', path: '/wiki/test' }, revision: { _id: 'rev2' } });

    await editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'GROWI' }] }, 'default');

    expect(mockedPutPage).toHaveBeenCalledWith({ pageId: 'page1', revisionId: 'rev1', body: 'hello GROWI', wip: true }, { appName: 'default' });
  });

  it('supports addressing the page by path', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev1'));
    mockedPutPage.mockResolvedValue({ page: { _id: 'page1', path: '/wiki/test' }, revision: { _id: 'rev2' } });

    const result = await editPage({ path: '/wiki/test', edits: [{ oldString: 'world', newString: 'GROWI' }] }, 'default');

    expect(mockedGetPage).toHaveBeenCalledWith({ pageId: undefined, path: '/wiki/test' }, { appName: 'default' });
    expect(mockedPutPage).toHaveBeenCalledWith({ pageId: 'page1', revisionId: 'rev1', body: 'hello GROWI' }, { appName: 'default' });
    expect(result.pageId).toBe('page1');
  });

  it('normalizes read failures into GrowiApiError without leaking the raw error', async () => {
    mockedGetPage.mockRejectedValue(Object.assign(new Error('Forbidden'), { response: { status: 403, data: { code: 'page-is-forbidden' } } }));

    await expect(editPage({ pageId: 'page1', edits: [{ oldString: 'a', newString: 'b' }] }, 'default')).rejects.toMatchObject({
      name: 'GrowiApiError',
      statusCode: 403,
      details: { pageId: 'page1', path: undefined, responseData: { code: 'page-is-forbidden' } },
    });
    expect(mockedPutPage).not.toHaveBeenCalled();
  });

  it('returns no newRevisionId (instead of a stale one) when the save response lacks a revision', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('hello world', 'rev1'));
    mockedPutPage.mockResolvedValue({ page: { _id: 'page1', path: '/wiki/test' } });

    const result = await editPage({ pageId: 'page1', edits: [{ oldString: 'world', newString: 'GROWI' }] }, 'default');

    expect(result.newRevisionId).toBeUndefined();
  });
});
