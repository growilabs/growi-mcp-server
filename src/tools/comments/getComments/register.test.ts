import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerGetCommentsTool } from './register.js';

vi.mock('@growi/sdk-typescript/v3', () => ({
  default: {
    getComments: vi.fn(),
  },
}));

// Isolates these tests from config/default.ts, which parses process.env at import time.
vi.mock('../../../commons/utils/resolve-app-name.js', () => ({
  resolveAppName: vi.fn((appName?: string) => appName ?? 'default'),
}));

const mockedGetComments = apiv3.getComments as unknown as Mock;

interface CapturedTool {
  name: string;
  execute: (params: unknown) => Promise<string>;
}

const registerAndGetTool = (): CapturedTool => {
  const tools: CapturedTool[] = [];
  const server = {
    addTool: (tool: CapturedTool) => {
      tools.push(tool);
    },
  } as unknown as FastMCP;
  registerGetCommentsTool(server);
  return tools[0];
};

describe('getComments tool', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns regular and inline comments from the apiv3 comments API', async () => {
    const comments = [
      { _id: 'c1', isInline: false },
      { _id: 'c2', isInline: true },
    ];
    mockedGetComments.mockResolvedValue({ comments });

    const response = JSON.parse(await registerAndGetTool().execute({ pageId: 'page1' }));

    expect(response.comments).toEqual(comments);
    expect(mockedGetComments).toHaveBeenCalledWith({ pageId: 'page1' }, { appName: 'default' });
  });

  it('passes revisionId through to the API when given', async () => {
    mockedGetComments.mockResolvedValue({ comments: [] });

    await registerAndGetTool().execute({ pageId: 'page1', revisionId: 'rev1' });

    expect(mockedGetComments).toHaveBeenCalledWith({ pageId: 'page1', revisionId: 'rev1' }, { appName: 'default' });
  });
});
