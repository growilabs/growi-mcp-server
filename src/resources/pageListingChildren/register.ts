import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';

export function registerPageListingChildrenResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://page-listing/children{?id,path}',
    name: 'GROWI Page Listing Children',
    description: 'Retrieves children pages for a specified page by ID or path',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'id',
        description: 'Page ID to get children for (optional)',
        required: false,
      },
      {
        name: 'path',
        description: 'Page path to get children for (optional)',
        required: false,
      },
    ],
    async load(params) {
      try {
        const result = await apiv3.getChildrenForPageListing(params);
        return { text: JSON.stringify(result) };
      } catch (error) {
        const { id, path } = params;
        console.error(`Error loading GROWI page listing children for id="${id}" path="${path}":`, error);
        throw new Error(`Failed to load GROWI page listing children: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}
