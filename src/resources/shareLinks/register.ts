import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';

export function registerShareLinksResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://share-links{?relatedPage}',
    name: 'GROWI Share Links',
    description: 'Get share links for a specific page',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'relatedPage',
        description: 'Page ID to get share links for',
        required: true,
      },
    ],
    async load(params) {
      try {
        const result = await apiv3.getShareLinks(params);
        return { text: JSON.stringify(result) };
      } catch (error) {
        const { relatedPage } = params;
        console.error(`Error loading GROWI share links for relatedPage="${relatedPage}":`, error);
        throw new Error(`Failed to load GROWI share links: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}
