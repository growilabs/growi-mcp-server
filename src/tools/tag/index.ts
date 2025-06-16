import type { FastMCP } from 'fastmcp';
import { registerGetTagListTool } from './getTagList';
import { registerSearchTagsTool } from './searchTags';
import { registerUpdateTagTool } from './updateTag';

export async function loadTagTools(server: FastMCP): Promise<void> {
  registerUpdateTagTool(server);
  registerGetTagListTool(server);
  registerSearchTagsTool(server);
}
