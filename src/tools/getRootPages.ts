import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { z } from 'zod';
import { isGrowiApiError } from '../services/growi-api-error.js';
import { type IPageService, tokenPageService } from '../services/page-service.js';

const getRootPagesSchema = z.object({
  limit: z.number().int().min(1).optional().describe('Maximum number of pages to return'),
  offset: z.number().int().min(0).optional().describe('Number of pages to skip'),
  sort: z.string().optional().describe('Sort order (e.g. "createdAt", "-updatedAt")'),
});

export function registerGetRootPagesTool(server: FastMCP): void {
  const pageService = container.resolve<IPageService>(tokenPageService);

  server.addTool({
    name: 'getRootPages',
    description: 'Get list of root pages from GROWI',
    parameters: getRootPagesSchema,
    execute: async (args) => {
      const params = getRootPagesSchema.parse(args);
      try {
        const response = await pageService.getRootPages(params);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(
            `Failed to get root pages: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`,
          );
        }
        throw error;
      }
    },
  });
}
