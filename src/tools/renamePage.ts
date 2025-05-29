import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { z } from 'zod';
import { isGrowiApiError } from '../services/growi-api-error.js';
import { type IPageService, tokenPageService } from '../services/page-service.js';

const renamePageSchema = z.object({
  pageId: z.string().describe('ID of the page to rename'),
  newPagePath: z.string().describe('New path for the page'),
  revisionId: z.string().optional().describe('Revision ID of the page'),
  isRenameRedirect: z.boolean().optional().describe('Whether to create a redirect from the old path'),
  isRecursively: z.boolean().optional().describe('Whether to rename child pages recursively'),
  isMoveMode: z.boolean().optional().describe('Whether to use move mode'),
  updateMetadata: z.boolean().optional().describe('Whether to update page metadata'),
});

export function registerRenamePageTool(server: FastMCP): void {
  const pageService = container.resolve<IPageService>(tokenPageService);

  server.addTool({
    name: 'renamePage',
    description: 'Rename or move a page in GROWI',
    parameters: renamePageSchema,
    execute: async (args) => {
      const params = renamePageSchema.parse(args);
      try {
        const page = await pageService.renamePage(params);
        return JSON.stringify(page);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to rename page: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}
