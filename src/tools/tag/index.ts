import type { FastMCP } from 'fastmcp';
import { registerUpdateTagTool } from './updateTag';

export async function loadTagTools(server: FastMCP): Promise<void> {
  registerUpdateTagTool(server);
}
