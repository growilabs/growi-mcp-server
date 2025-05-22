import type { IPage } from '@growi/core/dist/interfaces';
import type { FastMCP } from 'fastmcp';
import { GrowiService } from '../services/growi-service.js';

export function registerGrowiPageResource(server: FastMCP): void {
  const growiService = new GrowiService();

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
        const page: IPage = await growiService.getPage(String(pagePath));
        return { text: JSON.stringify(page) };
      } catch (error) {
        console.error(`Error loading GROWI page resource for path "${pagePath}":`, error);
        throw new Error(`Failed to load GROWI page: ${pagePath}`);
      }
    },
  });
}
