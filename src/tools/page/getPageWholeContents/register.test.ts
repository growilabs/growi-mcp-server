import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerGetPageTool, registerGetPageWholeContentsTool } from './register.js';

vi.mock('@growi/sdk-typescript/v3', () => ({
  default: {
    getPage: vi.fn(),
  },
}));

// Isolates these tests from config/default.ts (which parses process.env at import time and
// throws when no GROWI app is configured). resolveAppName's own behavior is covered elsewhere.
vi.mock('../../../commons/utils/resolve-app-name.js', () => ({
  resolveAppName: vi.fn((appName?: string) => appName ?? 'default'),
}));

const mockedGetPage = apiv3.getPage as unknown as Mock;

interface CapturedTool {
  name: string;
  description: string;
  execute: (params: unknown) => Promise<string>;
}

/** Minimal FastMCP stand-in: just enough for `server.addTool(...)` to capture what was registered. */
const captureTools = (): { server: FastMCP; tools: CapturedTool[] } => {
  const tools: CapturedTool[] = [];
  const server = {
    addTool: (tool: CapturedTool) => {
      tools.push(tool);
    },
  } as unknown as FastMCP;
  return { server, tools };
};

const getTool = (tools: CapturedTool[], name: string): CapturedTool => {
  const tool = tools.find((t) => t.name === name);
  if (tool == null) {
    throw new Error(`Tool "${name}" was not registered`);
  }
  return tool;
};

const pageResponse = (body: string) => ({
  page: { _id: 'page1', path: '/wiki/test', revision: { _id: 'rev1', body } },
});

describe('getPageWholeContents / getPage registration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('registers getPageWholeContents, and it returns the full page body', async () => {
    const body = ['# Title', '', 'full body text'].join('\n');
    mockedGetPage.mockResolvedValue(pageResponse(body));

    const { server, tools } = captureTools();
    registerGetPageWholeContentsTool(server);

    const response = JSON.parse(await getTool(tools, 'getPageWholeContents').execute({ pageId: 'page1' }));
    expect(response.page.revision.body).toBe(body);
  });

  it('getPage returns the same response as getPageWholeContents, plus a _notice', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('full body text'));

    const { server, tools } = captureTools();
    registerGetPageWholeContentsTool(server);
    registerGetPageTool(server);

    const wholeContentsResponse = JSON.parse(await getTool(tools, 'getPageWholeContents').execute({ pageId: 'page1' }));
    const getPageResponse = JSON.parse(await getTool(tools, 'getPage').execute({ pageId: 'page1' }));

    // Deliberately compare the two full responses rather than asserting on individual field
    // shapes: task 4 (running concurrently) is changing how grantedUsers is shaped, and this
    // test must keep passing regardless, since it only cares that the two tools agree with
    // each other, not what shape either one returns.
    const { _notice, ...getPageWithoutNotice } = getPageResponse;
    expect(getPageWithoutNotice).toEqual(wholeContentsResponse);
    expect(typeof _notice).toBe('string');
  });

  it('includes a deprecation _notice naming all 3 replacement tools and the removal version', async () => {
    mockedGetPage.mockResolvedValue(pageResponse('x'));

    const { server, tools } = captureTools();
    registerGetPageTool(server);

    const response = JSON.parse(await getTool(tools, 'getPage').execute({ pageId: 'page1' }));

    expect(response._notice).toContain('getPageOutline');
    expect(response._notice).toContain('getPageSection');
    expect(response._notice).toContain('getPageWholeContents');
    expect(response._notice).toContain('2.0.0');
  });

  it('describes getPage as deprecated and points to its replacements, before the tool is ever called', async () => {
    const { server, tools } = captureTools();
    registerGetPageTool(server);

    const { description } = getTool(tools, 'getPage');

    expect(description).toContain('DEPRECATED');
    expect(description).toContain('getPageOutline');
    expect(description).toContain('getPageSection');
    expect(description).toContain('getPageWholeContents');
    expect(description).toContain('2.0.0');
  });
});
