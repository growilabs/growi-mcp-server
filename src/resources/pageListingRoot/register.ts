import type { FastMCP } from 'fastmcp';
import { getPageListingRoot } from './service.js';

export function registerPageListingRootResource(server: FastMCP): void {
  server.addResource({
    uri: 'growi://page-listing/root',
    name: 'GROWI Root Page Listing',
    description: 'Retrieves root page listing information from GROWI',
    mimeType: 'application/json',
    async load() {
      try {
        const response = await getPageListingRoot();
        return { text: JSON.stringify(response) };
      } catch (error) {
        console.error('Error loading GROWI root page listing:', error);
        throw new Error(`Failed to load GROWI root page listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}
