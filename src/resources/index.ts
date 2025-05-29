import type { FastMCP } from 'fastmcp';
import { registerAncestorsChildrenResource } from './ancestorsChildren';
import { registerGetExternalAccountsResource } from './externalAccounts';
import { registerMeResource } from './me';
import { registerPageResource } from './page';
import { registerPageTagsResource } from './tag';
import { registerUserPagesResource } from './userPages';

export async function loadResources(server: FastMCP): Promise<void> {
  registerPageResource(server);
  registerAncestorsChildrenResource(server);
  registerPageTagsResource(server);
  registerMeResource(server);
  registerGetExternalAccountsResource(server);
  registerUserPagesResource(server);
}
