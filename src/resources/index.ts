import type { FastMCP } from 'fastmcp';
import { registerGetAncestorsChildrenTool } from './ancestorsChildren';
import { registerPageResource } from './page/register';
import { registerGetPageTagTool } from './tag';

export async function loadResources(server: FastMCP): Promise<void> {
  registerPageResource(server);
  registerGetAncestorsChildrenTool(server);
  registerGetPageTagTool(server);
}
