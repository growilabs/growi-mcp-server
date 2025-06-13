import apiv1 from '@growi/sdk-typescript/v1';
import type { FastMCP } from 'fastmcp';

export function registerTagListResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://tags/list{?limit,offset}',
    name: 'GROWI Tag List',
    description: 'Retrieves list of tags in GROWI with pagination',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'limit',
        description: 'Number of tags to retrieve per page (optional)',
        required: false,
      },
      {
        name: 'offset',
        description: 'Offset for pagination (optional)',
        required: false,
      },
    ],
    async load({ limit, offset }) {
      try {
        const params = {
          ...(limit && { limit: Number.parseInt(limit, 10) }),
          ...(offset && { offset: Number.parseInt(offset, 10) }),
        };
        const result = await apiv1.listTags(params);
        return { text: JSON.stringify(result) };
      } catch (error) {
        console.error(`Error loading GROWI tag list with limit="${limit}" offset="${offset}":`, error);
        throw new Error(`Failed to load GROWI tag list: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}
