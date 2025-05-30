import type { FastMCP } from 'fastmcp';
import { registerCreatePageTool } from './createPage';
import { registerDeletePagesTool } from './deletePages';
import { registerRenamePageTool } from './renamePage';
import { registerUpdatePageTool } from './updatePage';

export async function loadPageTools(server: FastMCP): Promise<void> {
  registerCreatePageTool(server);
  registerUpdatePageTool(server);
  registerRenamePageTool(server);
  registerDeletePagesTool(server);
}
