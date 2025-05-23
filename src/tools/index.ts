import type { FastMCP } from 'fastmcp';
import { registerGetPageTool } from './getPage.js';

/**
 * Loads and registers all MCP tools with the server.
 * As new tools are added, their registration functions should be imported
 * and called here.
 */
export async function loadTools(server: FastMCP): Promise<void> {
  // Register the getPage tool
  registerGetPageTool(server);

  // Add other tool registrations here as they are created
  // Example:
  // registerAnotherTool(server);
}
