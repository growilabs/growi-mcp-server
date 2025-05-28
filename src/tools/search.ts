import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { z } from 'zod';
import { isGrowiApiError } from '../services/growi-api-error.js';
import { type ISearchService, tokenSearchService } from '../services/search-service.js';

export const indicesSchema = z.object({});

export const searchSchema = z.object({
  query: z.string().min(1).describe('Search query string'),
  limit: z.number().int().min(1).optional().describe('Maximum number of results to return'),
  offset: z.number().int().min(0).optional().describe('Number of results to skip'),
  sort: z.string().optional().describe('Sort order (e.g. "createdAt", "-updatedAt")'),
});

export function registerSearchTool(server: FastMCP): void {
  const searchService = container.resolve<ISearchService>(tokenSearchService);

  server.addTool({
    name: 'search',
    description: 'Search pages in GROWI',
    parameters: searchSchema,
    execute: async (args) => {
      const params = searchSchema.parse(args);
      try {
        const response = await searchService.search(params.query, params.limit, params.offset, params.sort);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to search pages: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}

export function registerSearchIndicesTool(server: FastMCP): void {
  const searchService = container.resolve<ISearchService>(tokenSearchService);

  server.addTool({
    name: 'indices',
    description: 'Get search indices information from GROWI',
    parameters: indicesSchema,
    execute: async () => {
      try {
        const response = await searchService.getIndices();
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(
            `Failed to get indices info: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`,
          );
        }
        throw error;
      }
    },
  });
}
