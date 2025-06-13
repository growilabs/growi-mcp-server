import apiv1 from '@growi/sdk-typescript/v1';
import type { FastMCP } from 'fastmcp';

export function registerPageTagResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://page/{pageId}/tags',
    name: 'GROWI Page Tags',
    description: 'Retrieves tags for a specific page',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'pageId',
        description: 'Page ID to get tags for',
        required: true,
      },
    ],
    async load({ pageId }) {
      try {
        const result = await apiv1.getPageTag({ pageId });
        return { text: JSON.stringify(result) };
      } catch (error) {
        console.error(`Error loading GROWI page tags for page "${pageId}":`, error);
        throw new Error(`Failed to load GROWI page tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}
