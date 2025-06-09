import type { FastMCP } from 'fastmcp';
import { registerAncestorsChildrenResource } from './ancestorsChildren';
import { registerGetExternalAccountsResource } from './externalAccounts';
import { registerMeResource } from './me';
import { registerPageResource } from './page';
import { registerPageInfoResource } from './page/info';
import { registerPageTagsResource } from './tag';

export async function loadResources(server: FastMCP): Promise<void> {
  registerPageResource(server);
  registerPageInfoResource(server);
  registerAncestorsChildrenResource(server);
  registerPageTagsResource(server);
  registerMeResource(server);
  registerGetExternalAccountsResource(server);
}
