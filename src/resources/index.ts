import type { FastMCP } from 'fastmcp';
import { registerCommentsResource } from './comments';
import { registerPageResource } from './page';
import { registerPageInfoResource } from './page/info';
import { registerPageListingChildrenResource } from './pageListingChildren';
import { registerPageListingRootResource } from './pageListingRoot';
import { registerPageTagResource } from './pageTag';
import { registerRecentPagesResource } from './recent';
import { registerRevisionResource } from './revision';
import { registerShareLinksResource } from './shareLinks';
import { registerTagListResource } from './tagList';
import { registerTagSearchResource } from './tagSearch';
import { registerUserRecentResource } from './user';

export async function loadResources(server: FastMCP): Promise<void> {
  registerPageResource(server);
  registerPageInfoResource(server);
  registerRecentPagesResource(server);
  registerPageListingRootResource(server);
  registerPageListingChildrenResource(server);
  registerCommentsResource(server);
  registerUserRecentResource(server);
  registerRevisionResource(server);
  registerPageTagResource(server);
  registerTagSearchResource(server);
  registerTagListResource(server);
  registerShareLinksResource(server);
}
