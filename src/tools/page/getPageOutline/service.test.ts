import apiv3 from '@growi/sdk-typescript/v3';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPageOutline } from './service.js';

vi.mock('@growi/sdk-typescript/v3', () => ({
  default: {
    getPage: vi.fn(),
  },
}));

const mockedGetPage = apiv3.getPage as unknown as Mock;

describe('getPageOutline service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the outline with page identity and revisionId for chaining into editPage', async () => {
    const body = ['# Title', 'intro', '## Section', 'text'].join('\n');
    mockedGetPage.mockResolvedValue({
      page: { _id: 'page1', path: '/wiki/test', updatedAt: '2026-07-29T00:00:00.000Z', revision: { _id: 'rev1', body } },
    });

    const result = await getPageOutline({ pageId: 'page1' }, 'default');

    expect(result).toMatchObject({
      pageId: 'page1',
      path: '/wiki/test',
      revisionId: 'rev1',
      totalLines: 4,
      totalChars: body.length,
    });
    expect(result.outline.map((entry) => entry.text)).toEqual(['Title', 'Section']);
  });

  it('filters the outline by maxDepth while keeping section ranges intact', async () => {
    const body = ['# H1', '## H2', '### H3', 'text'].join('\n');
    mockedGetPage.mockResolvedValue({ page: { _id: 'page1', path: '/p', revision: { _id: 'rev1', body } } });

    const result = await getPageOutline({ pageId: 'page1', maxDepth: 2 }, 'default');

    expect(result.outline.map((entry) => entry.text)).toEqual(['H1', 'H2']);
    expect(result.outline[1].endLine).toBe(4); // H2's section still spans the hidden H3
    expect(result.hiddenHeadingCount).toBe(1);
  });

  it('propagates the unterminatedFence warning to the tool response', async () => {
    const body = ['# A', '```', 'code', '# Hidden'].join('\n');
    mockedGetPage.mockResolvedValue({ page: { _id: 'page1', path: '/p', revision: { _id: 'rev1', body } } });

    const result = await getPageOutline({ pageId: 'page1' }, 'default');

    expect(result.unterminatedFence).toBe(true);
    expect(result.outline.map((entry) => entry.text)).toEqual(['A']);
  });

  it('keeps the whole page addressable via preamble when maxDepth hides every heading', async () => {
    const body = ['intro', '### Deep', 'text', 'more'].join('\n');
    mockedGetPage.mockResolvedValue({ page: { _id: 'page1', path: '/p', revision: { _id: 'rev1', body } } });

    const result = await getPageOutline({ pageId: 'page1', maxDepth: 2 }, 'default');

    expect(result.outline).toHaveLength(0);
    expect(result.hiddenHeadingCount).toBe(1);
    expect(result.preamble).toMatchObject({ startLine: 1, endLine: 4, chars: body.length });
  });

  it('extends the preamble when maxDepth hides the leading headings only', async () => {
    const body = ['#### Tiny', 'x', '# Big', 'y'].join('\n');
    mockedGetPage.mockResolvedValue({ page: { _id: 'page1', path: '/p', revision: { _id: 'rev1', body } } });

    const result = await getPageOutline({ pageId: 'page1', maxDepth: 2 }, 'default');

    expect(result.outline.map((entry) => entry.text)).toEqual(['Big']);
    expect(result.preamble).toMatchObject({ startLine: 1, endLine: 2 });
  });
});
