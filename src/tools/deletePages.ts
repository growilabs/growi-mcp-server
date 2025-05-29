import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { z } from 'zod';
import { isGrowiApiError } from '../services/growi-api-error.js';
import { type IPageService, tokenPageService } from '../services/page-service.js';

const deletePageSchema = z.object({
  pageIdToRevisionIdMap: z.record(z.string()).describe('Map of page IDs to their revision IDs'),
  isCompletely: z.boolean().optional().describe('Whether to completely delete the pages'),
  isRecursively: z.boolean().optional().describe('Whether to delete child pages recursively'),
  isAnyoneWithTheLink: z.boolean().optional().describe('Whether to delete pages accessible by anyone with the link'),
});

export function registerDeletePagesTool(server: FastMCP): void {
  const pageService = container.resolve<IPageService>(tokenPageService);

  server.addTool({
    name: 'deletePages',
    description: 'Delete pages in GROWI',
    parameters: deletePageSchema,
    execute: async (args) => {
      const params = deletePageSchema.parse(args);
      try {
        const response = await pageService.deletePages(params);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to delete pages: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}
