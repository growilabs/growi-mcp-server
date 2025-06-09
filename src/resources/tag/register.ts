import type { FastMCP } from 'fastmcp';
import { getPageTags } from './service.js';

export function registerPageTagsResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://tag/{pageId}',
    name: 'GROWI Page Tag',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'pageId',
        description: 'ID of the page to get tags for',
        required: true,
      },
    ],
    async load({ pageId }) {
      try {
        const response = await getPageTags({ pageId });
        return { text: JSON.stringify(response) };
      } catch (error) {
        console.error(`Error loading GROWI page tags for page "${pageId}":`, error);
        throw new Error(`Failed to load GROWI page tags: ${pageId}`);
      }
    },
  });
}
