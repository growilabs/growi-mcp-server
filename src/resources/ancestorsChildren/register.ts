import type { FastMCP } from 'fastmcp';
import { listAncestorsChildren } from './service.js';

export function registerAncestorsChildrenResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://ancestors-children/{pageId}',
    name: 'GROWI Ancestors and Children',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'pageId',
        description: 'ID of the GROWI page',
        required: true,
      },
    ],
    async load({ pageId }) {
      try {
        const response = await listAncestorsChildren({ pageId });
        return { text: JSON.stringify(response) };
      } catch (error) {
        console.error(`Error loading ancestors and children for page "${pageId}":`, error);
        throw new Error(`Failed to load ancestors and children for page: ${pageId}`);
      }
    },
  });
}
