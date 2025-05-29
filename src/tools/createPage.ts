import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { z } from 'zod';
import { isGrowiApiError } from '../services/growi-api-error.js';
import { type IPageService, tokenPageService } from '../services/page-service.js';

const createPageSchema = z.object({
  path: z.string().describe('Path of the page to create'),
  body: z.string().describe('Content of the page'),
  grant: z.number().min(0).max(5).optional().describe('Grant level for the page (0-5)'),
  overwrite: z.boolean().optional().describe('Whether to overwrite existing page'),
});

export function registerCreatePageTool(server: FastMCP): void {
  const pageService = container.resolve<IPageService>(tokenPageService);

  server.addTool({
    name: 'createPage',
    description: 'Create a new page in GROWI',
    parameters: createPageSchema,
    execute: async (args) => {
      const params = createPageSchema.parse(args);
      try {
        const page = await pageService.createPage(params);
        return JSON.stringify(page);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to create page: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}
