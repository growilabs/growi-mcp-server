import type { IPage } from '@growi/core/dist/interfaces';
import type { FastMCP } from 'fastmcp';
import { getPage } from '../tools/getPage/service.js';

export function registerGrowiPageResource(server: FastMCP): void {
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
        const page: IPage = await getPage({ pagePath: String(pagePath) });
        return { text: JSON.stringify(page) };
      } catch (error) {
        console.error(`Error loading GROWI page resource for path "${pagePath}":`, error);
        throw new Error(`Failed to load GROWI page: ${pagePath}`);
      }
    },
  });
}
