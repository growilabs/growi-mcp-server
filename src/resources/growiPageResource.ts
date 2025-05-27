import type { IPage } from '@growi/core/dist/interfaces';
import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { type IPageService, tokenPageService } from '../services/page-service.js';

export function registerGrowiPageResource(server: FastMCP): void {
  const pageService = container.resolve<IPageService>(tokenPageService);

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
        const page: IPage = await pageService.getPage(String(pagePath));
        return { text: JSON.stringify(page) };
      } catch (error) {
        console.error(`Error loading GROWI page resource for path "${pagePath}":`, error);
        throw new Error(`Failed to load GROWI page: ${pagePath}`);
      }
    },
  });
}
