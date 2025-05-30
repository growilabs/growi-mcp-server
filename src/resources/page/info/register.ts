import type { FastMCP } from 'fastmcp';
import { getPageInfo } from './service.js';
import type { GetPageInfoParams } from './service.js';

export function registerPageInfoResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://page/info/{pageId}',
    name: 'GROWI Page Information',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'pageId',
        description: 'ID of the GROWI page',
        required: true,
      },
    ],
    async load({ pageId }: { pageId: string }) {
      try {
        const params: GetPageInfoParams = {
          pageId,
        };

        const pageInfo = await getPageInfo(params);
        return { text: JSON.stringify(pageInfo) };
      } catch (error) {
        console.error(`Error loading GROWI page info for ID "${pageId}":`, error);
        throw error;
      }
    },
  });
}
