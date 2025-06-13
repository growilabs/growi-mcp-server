import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';

export function registerPageListingRootResource(server: FastMCP): void {
  server.addResource({
    uri: 'growi://page-listing/root',
    name: 'GROWI Root Page Listing',
    description: 'Retrieves root page listing information from GROWI',
    mimeType: 'application/json',
    async load() {
      try {
        const response = await apiv3.getRootForPageListing();
        return { text: JSON.stringify(response) };
      } catch (error) {
        console.error('Error loading GROWI root page listing:', error);
        throw new Error(`Failed to load GROWI root page listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}
