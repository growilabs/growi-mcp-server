import type { FastMCP } from 'fastmcp';
import { registerPageResource } from './page';
import { registerPageInfoResource } from './page/info';
import { registerPageListingChildrenResource } from './pageListingChildren';
import { registerPageListingRootResource } from './pageListingRoot';
import { registerRecentPagesResource } from './recent';
import { registerUserRecentResource } from './user';

export async function loadResources(server: FastMCP): Promise<void> {
  registerPageResource(server);
  registerPageInfoResource(server);
  registerRecentPagesResource(server);
  registerPageListingRootResource(server);
  registerPageListingChildrenResource(server);
  registerUserRecentResource(server);
}
