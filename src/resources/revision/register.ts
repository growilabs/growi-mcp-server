import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';

export function registerRevisionResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://revision/{id}{?pageId}',
    name: 'GROWI Revision Detail',
    description: 'Retrieves detailed information about a specific revision',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'id',
        description: 'Revision ID to get details for',
        required: true,
      },
      {
        name: 'pageId',
        description: 'Page ID that the revision belongs to',
        required: true,
      },
    ],
    async load({ id, pageId }) {
      try {
        const result = await apiv3.getRevisionsById(id, { pageId });
        return { text: JSON.stringify(result) };
      } catch (error) {
        console.error(`Error loading GROWI revision details for revision "${id}" and page "${pageId}":`, error);
        throw new Error(`Failed to load GROWI revision details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}
