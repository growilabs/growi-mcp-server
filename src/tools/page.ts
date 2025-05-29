import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { z } from 'zod';
import { isGrowiApiError } from '../services/growi-api-error.js';
import { type IPageService, tokenPageService } from '../services/page-service.js';

const getPageTagSchema = z.object({
  pageId: z.string().describe('ID of the page to get tags for'),
});

const getAncestorsChildrenSchema = z.object({
  pageId: z.string().describe('ID of the page to get ancestors and children for'),
});

const getRootPagesSchema = z.object({
  limit: z.number().int().min(1).optional().describe('Maximum number of pages to return'),
  offset: z.number().int().min(0).optional().describe('Number of pages to skip'),
  sort: z.string().optional().describe('Sort order (e.g. "createdAt", "-updatedAt")'),
});

const createPageSchema = z.object({
  path: z.string().describe('Path of the page to create'),
  body: z.string().describe('Content of the page'),
  grant: z.number().min(0).max(5).optional().describe('Grant level for the page (0-5)'),
  overwrite: z.boolean().optional().describe('Whether to overwrite existing page'),
});

const updatePageSchema = z.object({
  pageId: z.string().describe('ID of the page to update'),
  body: z.string().describe('New content of the page'),
  grant: z.number().min(0).max(5).optional().describe('Grant level for the page (0-5)'),
  grantUserGroupId: z.string().optional().describe('ID of the user group to grant access to'),
  pageTags: z.array(z.string()).optional().describe('Array of tags to apply to the page'),
  revision: z.string().optional().describe('Revision ID for the page'),
});

const renamePageSchema = z.object({
  pageId: z.string().describe('ID of the page to rename'),
  newPagePath: z.string().describe('New path for the page'),
  revisionId: z.string().optional().describe('Revision ID of the page'),
  isRenameRedirect: z.boolean().optional().describe('Whether to create a redirect from the old path'),
  isRecursively: z.boolean().optional().describe('Whether to rename child pages recursively'),
  isMoveMode: z.boolean().optional().describe('Whether to use move mode'),
  updateMetadata: z.boolean().optional().describe('Whether to update page metadata'),
});

const deletePageSchema = z.object({
  pageIdToRevisionIdMap: z.record(z.string()).describe('Map of page IDs to their revision IDs'),
  isCompletely: z.boolean().optional().describe('Whether to completely delete the pages'),
  isRecursively: z.boolean().optional().describe('Whether to delete child pages recursively'),
  isAnyoneWithTheLink: z.boolean().optional().describe('Whether to delete pages accessible by anyone with the link'),
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
