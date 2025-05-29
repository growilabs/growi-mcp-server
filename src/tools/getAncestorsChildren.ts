import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { z } from 'zod';
import { isGrowiApiError } from '../services/growi-api-error.js';
import { type IPageService, tokenPageService } from '../services/page-service.js';

const getAncestorsChildrenSchema = z.object({
  pageId: z.string().describe('ID of the page to get ancestors and children for'),
});

export function registerGetAncestorsChildrenTool(server: FastMCP): void {
  const pageService = container.resolve<IPageService>(tokenPageService);

  server.addTool({
    name: 'getAncestorsChildren',
    description: 'Get ancestors and their children for a specific page in GROWI',
    parameters: getAncestorsChildrenSchema,
    execute: async (args) => {
      const { pageId } = getAncestorsChildrenSchema.parse(args);
      try {
        const response = await pageService.getAncestorsChildren(pageId);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(
            `Failed to get ancestors children: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`,
          );
        }
        throw error;
      }
    },
  });
}
