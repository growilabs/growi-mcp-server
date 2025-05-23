import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../services/growi-api-error.js';
import { GrowiService } from '../services/growi-service.js';

const getPageSchema = z.object({
  pagePath: z.string().describe('Path of the page to retrieve'),
});

export function registerGetPageTool(server: FastMCP): void {
  const growiService = new GrowiService();

  server.addTool({
    name: 'getPage',
    description: 'Get page information from GROWI',
    parameters: getPageSchema,
    execute: async (args) => {
      const { pagePath } = getPageSchema.parse(args);
      try {
        const page = await growiService.getPage(pagePath);
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
