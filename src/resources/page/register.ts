import type { FastMCP } from 'fastmcp';
import { getPage } from './service.js';

export function registerPageResource(server: FastMCP): void {
  // Root page resource
  server.addResource({
    uri: 'growi://page/root',
    name: 'GROWI Root Page Content',
    mimeType: 'application/json',
    async load() {
      try {
        const page = await getPage({ pagePath: '/' });
        return { text: JSON.stringify(page) };
      } catch (error) {
        console.error(`Error loading GROWI page resource for path "/":`, error);
        throw new Error('Failed to load GROWI root page');
      }
    },
  });

  // Page resource with pagePath parameter
  server.addResourceTemplate({
    uriTemplate: 'growi://page/{pagePath}',
    name: 'GROWI Page Content',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'pagePath',
        description: 'Path of the GROWI page',
        required: true,
      },
    ],
    async load({ pagePath }) {
      try {
        const page = await getPage({ pagePath });
        return { text: JSON.stringify(page) };
      } catch (error) {
        console.error(`Error loading GROWI page resource for path "${pagePath}":`, error);
        throw new Error(`Failed to load GROWI page: ${pagePath}`);
      }
    },
  });
}
