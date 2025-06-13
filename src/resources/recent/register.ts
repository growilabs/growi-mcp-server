import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';

export function registerRecentPagesResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://pages/recent{?limit,page,includeWip}',
    name: 'GROWI Recent Pages',
    description: 'Retrieves recently updated pages from GROWI',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'limit',
        description: 'Number of pages to retrieve per page (optional)',
        required: false,
      },
      {
        name: 'page',
        description: 'Page number for pagination (optional)',
        required: false,
      },
      {
        name: 'includeWip',
        description: 'Whether to include work-in-progress pages (optional)',
        required: false,
      },
    ],
    async load({ limit, page, includeWip }) {
      try {
        const params = {
          ...(limit && { limit: Number.parseInt(limit, 10) }),
          ...(page && { page: Number.parseInt(page, 10) }),
          ...(includeWip !== undefined && { includeWip: includeWip === 'true' }),
        };

        const result = await apiv3.getRecentForPages(params);
        return { text: JSON.stringify(result) };
      } catch (error) {
        console.error('Error loading GROWI recent pages:', error);
        throw new Error(`Failed to load GROWI recent pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}
