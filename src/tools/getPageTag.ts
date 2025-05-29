import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { z } from 'zod';
import { isGrowiApiError } from '../commons/api/growi-api-error.js';
import { type IPageService, tokenPageService } from '../services/page-service.js';

export const getPageTagSchema = z.object({
  pageId: z.string().describe('ID of the page to get tags for'),
});

export function registerGetPageTagTool(server: FastMCP): void {
  const pageService = container.resolve<IPageService>(tokenPageService);

  server.addTool({
    name: 'getPageTag',
    description: 'Get page tags from GROWI',
    parameters: getPageTagSchema,
    execute: async (args) => {
      const { pageId } = getPageTagSchema.parse(args);
      try {
        const response = await pageService.getPageTag(pageId);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(
            `Failed to get page tags: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`,
          );
        }
        throw error;
      }
    },
  });
}
