import apiv1 from '@growi/sdk-typescript/v1';
import type { FastMCP } from 'fastmcp';

export function registerCommentsResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://comments/{page_id}{?revision_id}',
    name: 'GROWI Page Comments',
    description: 'Retrieves comments for a page revision from GROWI',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'page_id',
        description: 'ID of the page to get comments for',
        required: true,
      },
      {
        name: 'revision_id',
        description: 'ID of the revision to get comments for (optional)',
        required: false,
      },
    ],
    async load({ page_id, revision_id }) {
      try {
        const params = {
          page_id,
          ...(revision_id && { revision_id }),
        };
        
        const response = await apiv1.getComments(params);
        return { text: JSON.stringify(response) };
      } catch (error) {
        console.error(`Error loading GROWI comments for page "${page_id}":`, error);
        throw new Error(`Failed to load GROWI comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}
