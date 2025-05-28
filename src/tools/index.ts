import type { FastMCP } from 'fastmcp';
import { registerGetPageTool } from './getPage.js';
import { registerGetRevisionTool, registerGetRevisionsTool } from './revision.js';
import { registerSearchIndicesTool, registerSearchTool } from './search.js';
import { registerGetExternalAccountsTool, registerLoginTool, registerLogoutTool, registerMeTool, registerRegisterTool } from './user.js';

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

  // Register the getPage tool
  registerGetPageTool(server);

  // Register the revision tools
  registerGetRevisionTool(server);
  registerGetRevisionsTool(server);

  // Register the search tools
  registerSearchTool(server);
  registerSearchIndicesTool(server);
}
