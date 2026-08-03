import apiv3 from '@growi/sdk-typescript/v3';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPageWholeContents } from './service.js';

vi.mock('@growi/sdk-typescript/v3', () => ({
  default: {
    getPage: vi.fn(),
  },
}));

const mockedGetPage = apiv3.getPage as unknown as Mock;

describe('getPageWholeContents service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the full markdown body of the page', async () => {
    const body = ['# Title', '', 'full body text'].join('\n');
    mockedGetPage.mockResolvedValue({
      page: { _id: 'page1', path: '/wiki/test', revision: { _id: 'rev1', body } },
    });

    const result = await getPageWholeContents({ pageId: 'page1' }, 'default');

    expect(mockedGetPage).toHaveBeenCalledWith({ pageId: 'page1' }, { appName: 'default' });
    expect((result.page as { revision: { body: string } }).revision.body).toBe(body);
  });

  it('passes the resolved app name and page params through to the SDK', async () => {
    mockedGetPage.mockResolvedValue({ page: { _id: 'page2', path: '/wiki/other', revision: { _id: 'rev2', body: 'x' } } });

    await getPageWholeContents({ path: '/wiki/other' }, 'staging');

    expect(mockedGetPage).toHaveBeenCalledWith({ path: '/wiki/other' }, { appName: 'staging' });
  });

  it('passes through a null page unchanged when the SDK reports none found', async () => {
    mockedGetPage.mockResolvedValue({ page: null });

    const result = await getPageWholeContents({ pageId: 'missing' }, 'default');

    expect(result.page).toBeNull();
  });
});
