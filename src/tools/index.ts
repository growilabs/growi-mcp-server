import type { FastMCP } from 'fastmcp';
import { loadPageTools } from './page/index.js';
import { registerGetRevisionTool, registerGetRevisionsTool } from './revision.js';
import { registerSearchIndicesTool, registerSearchTool } from './search.js';
import { registerRegisterTool } from './user.js';

/**
 * Loads and registers all MCP tools with the server.
 * As new tools are added, their registration functions should be imported
 * and called here.
 */
export async function loadTools(server: FastMCP): Promise<void> {
  loadPageTools(server);

  // Register authentication tools
  registerRegisterTool(server);

  // Register the revision tools
  registerGetRevisionTool(server);
  registerGetRevisionsTool(server);

  // Register the search tools
  registerSearchTool(server);
  registerSearchIndicesTool(server);
}
