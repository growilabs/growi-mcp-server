import type { FastMCP } from 'fastmcp';
import { registerGetUserRecentPagesTool } from './getUserRecentPages';

export async function loadUserTools(server: FastMCP): Promise<void> {
  registerGetUserRecentPagesTool(server);
}
