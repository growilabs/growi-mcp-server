import type { FastMCP } from 'fastmcp';
import { registerPageResource } from './page';
import { registerPageInfoResource } from './page/info';
import { registerRecentPagesResource } from './recent';
import { registerPageTagsResource } from './tag';

export async function loadResources(server: FastMCP): Promise<void> {
  registerPageResource(server);
  registerPageInfoResource(server);
  registerPageTagsResource(server);
  registerRecentPagesResource(server);
}
