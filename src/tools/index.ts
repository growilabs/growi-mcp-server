import type { FastMCP } from 'fastmcp';
import { registerCreatePageTool } from './createPage';
import { registerDeletePagesTool } from './deletePages.js';
import { registerGetAncestorsChildrenTool } from './getAncestorsChildren.js';
import { registerGetPageTool } from './getPage/index.js';
import { registerGetPageTagTool } from './getPageTag/index.js';
import { registerGetRootPagesTool } from './getRootPages.js';
import { registerRenamePageTool } from './renamePage.js';
import { registerGetRevisionTool, registerGetRevisionsTool } from './revision.js';
import { registerSearchIndicesTool, registerSearchTool } from './search.js';
import { registerUpdatePageTool } from './updatePage/index.js';
import {
  registerGetExternalAccountsTool,
  registerGetUserPagesTool,
  registerLoginTool,
  registerLogoutTool,
  registerMeTool,
  registerRegisterTool,
} from './user.js';

/**
 * Loads and registers all MCP tools with the server.
 * As new tools are added, their registration functions should be imported
 * and called here.
 */
export async function loadTools(server: FastMCP): Promise<void> {
  // Register authentication tools
  registerLoginTool(server);
  registerRegisterTool(server);
  registerLogoutTool(server);
  registerMeTool(server);
  registerGetExternalAccountsTool(server);
  registerGetUserPagesTool(server);

  // Register page-related tools
  registerGetPageTool(server);
  registerGetPageTagTool(server);
  registerCreatePageTool(server);
  registerUpdatePageTool(server);
  registerGetRootPagesTool(server);
  registerGetAncestorsChildrenTool(server);
  registerRenamePageTool(server);
  registerDeletePagesTool(server);

  // Register the revision tools
  registerGetRevisionTool(server);
  registerGetRevisionsTool(server);

  // Register the search tools
  registerSearchTool(server);
  registerSearchIndicesTool(server);
}
