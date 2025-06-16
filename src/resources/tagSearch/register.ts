import apiv1 from '@growi/sdk-typescript/v1';
import type { FastMCP } from 'fastmcp';

export function registerTagSearchResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://tags/search{?q}',
    name: 'GROWI Tag Search',
    description: 'Search for tags in GROWI',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'q',
        description: 'Search query for tags (optional)',
        required: false,
      },
    ],
    async load({ q }) {
      try {
        const params = q ? { q } : undefined;
        const result = await apiv1.searchTags(params);
        return { text: JSON.stringify(result) };
      } catch (error) {
        console.error(`Error searching GROWI tags with query "${q}":`, error);
        throw new Error(`Failed to search GROWI tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}
