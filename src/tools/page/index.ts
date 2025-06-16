import type { FastMCP } from 'fastmcp';
import { registerCreatePageTool } from './createPage';
import { registerDeletePagesTool } from './deletePages';
import { registerDuplicatePageTool } from './duplicatePages';
import { registerGetPageInfoTool } from './getPageInfo';
import { registerGetPageListingChildrenTool } from './getPageListingChildren';
import { registerGetPageListingRootTool } from './getPageListingRoot';
import { registerGetPageTagTool } from './getPageTag';
import { registerGetRecentPagesTool } from './getRecentPages';
import { registerPageListingInfoTool } from './pageListingInfo';
import { registerPublishPageTool } from './publishPage';
import { registerRenamePageTool } from './renamePage';
import { registerSearchPagesTool } from './searchPages';
import { registerUnpublishPageTool } from './unpublishPage';
import { registerUpdatePageTool } from './updatePage';

export async function loadPageTools(server: FastMCP): Promise<void> {
  registerCreatePageTool(server);
  registerUpdatePageTool(server);
  registerRenamePageTool(server);
  registerDeletePagesTool(server);
  registerSearchPagesTool(server);
  registerPublishPageTool(server);
  registerUnpublishPageTool(server);
  registerDuplicatePageTool(server);
  registerPageListingInfoTool(server);
  registerGetPageInfoTool(server);
  registerGetPageListingChildrenTool(server);
  registerGetPageListingRootTool(server);
  registerGetPageTagTool(server);
  registerGetRecentPagesTool(server);
}
