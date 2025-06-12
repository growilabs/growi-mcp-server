import type { PageParams } from '@growi/sdk-typescript/v3';
import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';

export function registerPageInfoResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://page/info/{pageId}',
    name: 'GROWI Page Information',
    description: 'Retrieves information about a specific GROWI page including like status and view counts',
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
        const params: PageParams = {
          pageId,
        };

        const pageInfo = await apiv3.getInfoForPage(params);
        return { text: JSON.stringify(pageInfo) };
      } catch (error) {
        console.error(`Failed to retrieve page information for ID "${pageId}":`, error);
        throw new Error(`Failed to retrieve page information: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}
