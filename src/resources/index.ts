import type { FastMCP } from 'fastmcp';
import { registerAncestorsChildrenResource } from './ancestorsChildren';
import { registerPageResource } from './page/register';
import { registerPageTagsResource } from './tag';
import { loadUserResources } from './user';

export async function loadResources(server: FastMCP): Promise<void> {
  registerPageResource(server);
  registerAncestorsChildrenResource(server);
  registerPageTagsResource(server);
  loadUserResources(server);
}
