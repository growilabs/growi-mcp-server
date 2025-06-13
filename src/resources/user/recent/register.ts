import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';

export function registerUserRecentResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://user/{id}/recent',
    name: 'GROWI User Recent Pages',
    description: 'Retrieves recently created pages by a specific user',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'id',
        description: 'User ID to get recent pages for',
        required: true,
      },
    ],
    async load({ id }) {
      try {
        const result = await apiv3.getRecentById(id);
        return { text: JSON.stringify(result) };
      } catch (error) {
        console.error(`Error loading GROWI user recent pages for user "${id}":`, error);
        throw new Error(`Failed to load GROWI user recent pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}
