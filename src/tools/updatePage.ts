import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { z } from 'zod';
import { isGrowiApiError } from '../services/growi-api-error.js';
import { type IPageService, tokenPageService } from '../services/page-service.js';

const updatePageSchema = z.object({
  pageId: z.string().describe('ID of the page to update'),
  body: z.string().describe('New content of the page'),
  grant: z.number().min(0).max(5).optional().describe('Grant level for the page (0-5)'),
  grantUserGroupId: z.string().optional().describe('ID of the user group to grant access to'),
  pageTags: z.array(z.string()).optional().describe('Array of tags to apply to the page'),
  revision: z.string().optional().describe('Revision ID for the page'),
});

export function registerUpdatePageTool(server: FastMCP): void {
  const pageService = container.resolve<IPageService>(tokenPageService);

  server.addTool({
    name: 'updatePage',
    description: 'Update an existing page in GROWI',
    parameters: updatePageSchema,
    execute: async (args) => {
      const params = updatePageSchema.parse(args);
      try {
        const page = await pageService.updatePage(params);
        return JSON.stringify(page);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to update page: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}
