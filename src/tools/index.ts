import type { FastMCP } from 'fastmcp';
import { loadPageTools } from './page';
import { loadUserTools } from './user';

/**
 * Loads and registers all MCP tools with the server.
 * As new tools are added, their registration functions should be imported
 * and called here.
 */
export async function loadTools(server: FastMCP): Promise<void> {
  loadPageTools(server);
  loadUserTools(server);
}
