import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { z } from 'zod';
import { isGrowiApiError } from '../services/growi-api-error.js';
import { type IPageService, tokenPageService } from '../services/page-service.js';

const getPageSchema = z.object({
  pagePath: z.string().describe('Path of the page to retrieve'),
});

export function registerGetPageTool(server: FastMCP): void {
  const pageService = container.resolve<IPageService>(tokenPageService);

  server.addTool({
    name: 'getPage',
    description: 'Get page information from GROWI',
    parameters: getPageSchema,
    execute: async (args) => {
      const { pagePath } = getPageSchema.parse(args);
      try {
        const page = await pageService.getPage(pagePath);
        return JSON.stringify(page);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to get page: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}
