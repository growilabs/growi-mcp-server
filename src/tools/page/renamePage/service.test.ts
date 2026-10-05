import apiv3 from '@growi/sdk-typescript/v3';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renamePage } from './service.js';

vi.mock('@growi/sdk-typescript/v3', () => ({
  default: {
    getExistPathsForPage: vi.fn(),
    getPage: vi.fn(),
    putRenameForPages: vi.fn(),
  },
}));

const mockedGetPage = apiv3.getPage as unknown as Mock;
const mockedPutRename = apiv3.putRenameForPages as unknown as Mock;

const renameParams = { pageId: 'page1', isRenameRedirect: false, isRecursively: false, updateMetadata: false };

describe('renamePage service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedPutRename.mockResolvedValue({ page: { _id: 'page1', path: '/new' } });
  });

  it('sends the revisionId given by the caller without fetching the page', async () => {
    await renamePage({ ...renameParams, newPagePath: '/new', revisionId: 'rev-given' }, 'default');

    expect(mockedGetPage).not.toHaveBeenCalled();
    expect(mockedPutRename).toHaveBeenCalledWith(expect.objectContaining({ pageId: 'page1', newPagePath: '/new', revisionId: 'rev-given' }), {
      appName: 'default',
    });
  });

  it('fetches the latest revision and sends it when the caller gives none', async () => {
    mockedGetPage.mockResolvedValue({ page: { _id: 'page1', revision: { _id: 'rev-latest', body: 'text' } } });

    await renamePage({ ...renameParams, newPagePath: '/new' }, 'default');

    expect(mockedGetPage).toHaveBeenCalledWith({ pageId: 'page1' }, { appName: 'default' });
    expect(mockedPutRename).toHaveBeenCalledWith(expect.objectContaining({ revisionId: 'rev-latest' }), { appName: 'default' });
  });

  it('accepts a page whose revision is returned as a plain ID string', async () => {
    mockedGetPage.mockResolvedValue({ page: { _id: 'page1', revision: 'rev-string' } });

    await renamePage({ ...renameParams, newPagePath: '/new' }, 'default');

    expect(mockedPutRename).toHaveBeenCalledWith(expect.objectContaining({ revisionId: 'rev-string' }), { appName: 'default' });
  });

  it('still renames an empty page, which has no revision', async () => {
    mockedGetPage.mockResolvedValue({ page: { _id: 'page1', revision: null } });

    const result = await renamePage({ ...renameParams, newPagePath: '/new' }, 'default');

    expect(mockedPutRename).toHaveBeenCalledTimes(1);
    expect(result.page).toMatchObject({ path: '/new' });
  });
});
