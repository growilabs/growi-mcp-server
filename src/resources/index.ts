import type { FastMCP } from 'fastmcp';
import { registerCommentsResource } from './comments';
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
  registerCommentsResource(server);
  registerUserRecentResource(server);
}
