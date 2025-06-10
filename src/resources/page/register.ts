import type { FastMCP } from 'fastmcp';

import apiv3 from '@growi/sdk-typescript/v3';

export function registerPageResource(server: FastMCP): void {
  // Root page resource
  server.addResource({
    uri: 'growi://page/root',
    name: 'GROWI Root Page Content',
    mimeType: 'application/json',
    async load() {
      try {
        const page = await apiv3.getPage({ path: '/' });
        return { text: JSON.stringify(page) };
      } catch (error) {
        console.error(`Error loading GROWI page resource for path "/":`, error);
        throw new Error('Failed to load GROWI root page');
      }
    },
  });

  // Page resource with pagePath parameter
  server.addResourceTemplate({
    uriTemplate: 'growi://page/{path}',
    name: 'GROWI Page Content',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'path',
        description: 'Page path of the GROWI page',
        required: true,
      },
    ],
    async load({ path }) {
      try {
        const page = await apiv3.getPage({ path });
        return { text: JSON.stringify(page) };
      } catch (error) {
        console.error(`Error loading GROWI page resource for path "${path}":`, error);
        throw new Error(`Failed to load GROWI page: ${path}`);
      }
    },
  });
}
