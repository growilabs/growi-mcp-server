import type { FastMCP } from 'fastmcp';
import { registerAncestorsChildrenResource } from './ancestorsChildren';
import { registerPageResource } from './page/register';
import { registerPageTagsResource } from './tag';

export async function loadResources(server: FastMCP): Promise<void> {
  registerPageResource(server);
  registerAncestorsChildrenResource(server);
  registerPageTagsResource(server);
}
