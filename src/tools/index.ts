import type { FastMCP } from 'fastmcp';
import { loadPageTools } from './page';
import { registerGetRevisionTool, registerGetRevisionsTool } from './revision.js';
import { registerSearchIndicesTool, registerSearchTool } from './search.js';
import { loadUserTools } from './user';

/**
 * Loads and registers all MCP tools with the server.
 * As new tools are added, their registration functions should be imported
 * and called here.
 */
export async function loadTools(server: FastMCP): Promise<void> {
  loadPageTools(server);

  // Register authentication tools
  loadUserTools(server);

  // Register the revision tools
  registerGetRevisionTool(server);
  registerGetRevisionsTool(server);

  // Register the search tools
  registerSearchTool(server);
  registerSearchIndicesTool(server);
}
