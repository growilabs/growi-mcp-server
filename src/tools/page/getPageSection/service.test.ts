import apiv3 from '@growi/sdk-typescript/v3';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GrowiApiError } from '../../../commons/api/growi-api-error.js';
import { HeadingMatchError } from '../../../commons/utils/markdown/parse-outline.js';
import { getPageSection } from './service.js';

vi.mock('@growi/sdk-typescript/v3', () => ({
  default: {
    getPage: vi.fn(),
  },
}));

const mockedGetPage = apiv3.getPage as unknown as Mock;

const mockPage = (body: string) => {
  mockedGetPage.mockResolvedValue({
    page: { _id: 'page1', path: '/wiki/test', revision: { _id: 'rev1', body } },
  });
};

describe('getPageSection service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('reads a section by heading including its subsections', async () => {
    mockPage(['# Top', 'intro', '## Setup', 'install', '### Detail', 'deep', '## Usage', 'use'].join('\n'));

    const result = await getPageSection({ pageId: 'page1', heading: 'Setup' }, 'default');

    expect(result).toMatchObject({
      startLine: 3,
      endLine: 6,
      matchedHeading: { text: 'Setup', level: 2 },
      truncated: false,
      body: ['## Setup', 'install', '### Detail', 'deep'].join('\n'),
    });
  });

  it('excludes subsections when includeSubsections is false', async () => {
    mockPage(['## Setup', 'install', '### Detail', 'deep'].join('\n'));

    const result = await getPageSection({ pageId: 'page1', heading: 'Setup', includeSubsections: false }, 'default');

    expect(result.body).toBe(['## Setup', 'install'].join('\n'));
  });

  it('propagates HeadingMatchError for an unknown heading', async () => {
    mockPage('# Only');

    await expect(getPageSection({ pageId: 'page1', heading: 'Missing' }, 'default')).rejects.toThrow(HeadingMatchError);
  });

  it('reads a line range, defaulting endLine to the end of the page', async () => {
    mockPage(['l1', 'l2', 'l3', 'l4'].join('\n'));

    const result = await getPageSection({ pageId: 'page1', startLine: 3 }, 'default');

    expect(result).toMatchObject({ startLine: 3, endLine: 4, totalLines: 4, truncated: false, body: 'l3\nl4' });
  });

  it('rejects startLine beyond the end of the page', async () => {
    mockPage('one line');

    await expect(getPageSection({ pageId: 'page1', startLine: 5 }, 'default')).rejects.toThrow(GrowiApiError);
  });

  it('rejects endLine smaller than startLine', async () => {
    mockPage(['l1', 'l2', 'l3'].join('\n'));

    await expect(getPageSection({ pageId: 'page1', startLine: 3, endLine: 1 }, 'default')).rejects.toThrow(GrowiApiError);
  });

  it('truncates at a line boundary and reports where to continue', async () => {
    mockPage(['aaaaa', 'bbbbb', 'ccccc', 'ddddd'].join('\n'));

    const result = await getPageSection({ pageId: 'page1', startLine: 1, endLine: 4, maxChars: 100 }, 'default');
    expect(result.truncated).toBe(false);

    const truncatedResult = await getPageSection({ pageId: 'page1', startLine: 1, endLine: 4, maxChars: 11 }, 'default');
    expect(truncatedResult).toMatchObject({
      truncated: true,
      endLine: 2,
      nextStartLine: 3,
      requestedEndLine: 4,
      body: 'aaaaa\nbbbbb',
    });
  });

  it('hard-cuts a single line longer than maxChars so the bound always holds', async () => {
    mockPage(`short\n${'x'.repeat(5000)}\nafter`);

    const result = await getPageSection({ pageId: 'page1', startLine: 2, endLine: 3, maxChars: 100 }, 'default');

    expect(result.body).toHaveLength(100);
    expect(result).toMatchObject({ truncated: true, lineTruncated: true, endLine: 2 });
    expect(result.nextStartLine).toBeUndefined();
  });
});
